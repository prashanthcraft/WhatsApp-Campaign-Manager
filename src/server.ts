import { initializeDB } from '@config/database';
import { logRequest } from '@middlewares/audit.middleware';
import { authenticate } from '@middlewares/authMiddleware';
import { checkMaintenanceMode } from '@middlewares/maintenance';
import requireTenantAccess from '@middlewares/requireTenant';
import logger, { logError } from '@utils/logger';
import { runWithAppContext } from '@utils/requestContext';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import 'module-alias/register';
import { APIError } from 'rest-api-errors';

import { appConfig } from './config/appConfig';
import routes from './routes';
import { excludedRoutes } from './routes/excludedRoutes';

const { baseRoutePrefix } = appConfig;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, name } = require('../package.json');

const app = express();
const excludeMaintenanceUrl: string[] = [];

// Apply compression to reduce response sizes.
app.use(compression());

// Parse incoming request bodies.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '25mb' }));

// Enable Cross-Origin Resource Sharing (CORS) for all requests.
app.use(cors({ origin: true }));

// Set custom headers for all responses.
app.use((req, resp, next) => {
  resp.header('x-powered-by', `Aimingle v${version}`);
  resp.header('x-version', version);
  next();
});

// Set up request context to be used in downstream middleware and routes.
app.use(runWithAppContext);

// Apply authentication middleware to secure the routes.
app.use(authenticate);

app.use(
  checkMaintenanceMode(
    excludeMaintenanceUrl.map((path) =>
      baseRoutePrefix ? `${baseRoutePrefix}${path}` : path,
    ),
  ),
);
app.use(
  requireTenantAccess(
    excludedRoutes.map((path) =>
      baseRoutePrefix ? `${baseRoutePrefix}${path}` : path,
    ),
  ),
);
app.use(logRequest);

// Set up base route prefix or default routes.
if (baseRoutePrefix) {
  app.use(baseRoutePrefix, routes());
} else {
  app.use(routes());
}

app.use((req, res, next) => {
  console.log(`Middleware called for ${req.method} ${req.url}`);
  next();
});

// Handle 404 errors for any unmatched route.
app.all('*', (req, resp) => {
  resp.status(404).send({
    path: req.path,
    code: 'unknown_endpoint',
    method: req.method,
  });
});

/**
 * Centralized error handling middleware.
 * Handles both expected (APIError) and unexpected errors.
 */
app.use((err: unknown, req: Request, resp: Response, next: NextFunction) => {
  const id = Date.now().toString(36).toUpperCase();
  let traceId = '';

  // Extract trace ID if available (useful for distributed tracing).
  const globalTrace: any = global;
  const agent = globalTrace._google_trace_agent;
  if (agent && agent.getCurrentContextId) {
    traceId = agent.getCurrentContextId();
  }

  if (err instanceof APIError) {
    // Handle expected errors (APIError).
    logger.error(`api_error:${id}:expected`, {
      error: {
        code: (err as APIError).code,
        message: (err as APIError).message,
      },
    });

    resp.status((err as APIError).status).send({
      code: (err as APIError).code,
      message: (err as APIError).message,
      traceId,
      id,
    });
  } else {
    // Handle unexpected errors.
    logError(`api_error:${id}:unexpected`, err);
    logger.error('error: ', err);

    resp.status(500).send({
      id,
      code: 'unknown_error',
      traceId,
    });
  }
});

/**
 * Initialize the database and start the server.
 */
(async () => {
  try {
    logger.debug('Initializing the database connection...');
    await initializeDB()
      .then((connection) => {
        logger.debug(
          'Entities:',
          connection.entityMetadatas.map((meta) => meta.name),
        );
        logger.debug('Database connection initialized successfully');
      })
      .catch((err) => {
        logger.error('Failed to initialize the database', err);
      });
    logger.debug('Database connection established, starting the server...'); 

    const port = Number(process.env.PORT || appConfig.port || 8080);
    app.listen(port, () => {
      logger.info(
        `${name} is listening on http://0.0.0.0:${port}${
          appConfig.baseRoutePrefix || ''
        }`,
      );
    });
  } catch (error) {
    // Log any errors during the initialization process.
    logError('Failed to initialize the database', error);
    process.exit(1); // Exit the process if initialization fails.
  }
})();
