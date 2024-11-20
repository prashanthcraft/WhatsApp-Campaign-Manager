import { loggingConfig } from '@config/logging';
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

import { RequestContext } from './requestContext';

const { version } = require('../../package.json');

// Define log formats
const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return `${timestamp} [${level}]: ${stack || message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

// Create Winston logger instance
const winstonLogger = createLogger({
  level: 'debug', // Default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // log the full stack trace for errors
    customFormat,
  ),
  transports: [], // Transports will be added conditionally to avoid duplication
});

// Add transports only if they haven't been added already
if (!winstonLogger.transports.some((t) => t instanceof transports.Console)) {
  winstonLogger.add(
    new transports.Console({
      format: combine(colorize(), customFormat),
    }),
  );
}

if (
  !winstonLogger.transports.some(
    (t) => t instanceof transports.File && t.filename === 'logs/error.log',
  )
) {
  winstonLogger.add(
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
  );
}

if (
  !winstonLogger.transports.some(
    (t) => t instanceof transports.File && t.filename === 'logs/combined.log',
  )
) {
  winstonLogger.add(new transports.File({ filename: 'logs/combined.log' }));
}

if (
  !winstonLogger.transports.some((t) => t instanceof transports.DailyRotateFile)
) {
  winstonLogger.add(
    new transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  );
}

// Export specific logging levels for convenience
const logger = {
  /**
   * Logs an informational message.
   * @param message - The informational message to be logged.
   * @param payload - Optional additional data to provide context to the log.
   */
  info: (message: string, payload?: any): void => {
    winstonLogger.info(message, appendSource(payload));
  },

  /**
   * Logs a debugging message.
   * @param message - The debugging message to be logged.
   * @param payload - Optional additional data to provide context to the log.
   */
  debug: (message: string, payload?: any): void => {
    winstonLogger.debug(message, appendSource(payload));
  },

  /**
   * Logs a warning message.
   * @param message - The warning message to be logged.
   * @param payload - Optional additional data to provide context to the log.
   */
  warn: (message: string, payload?: any): void => {
    winstonLogger.warn(message, appendSource(payload));
  },

  /**
   * Logs an error message.
   * @param message - The error message to be logged.
   * @param payload - Optional additional data to provide context to the error log.
   */
  error: (message: string, payload?: any): void => {
    winstonLogger.error(message, appendSource(payload));
  },

  /**
   * Logs a message with a specified level.
   * @param level - The level at which the message should be logged (e.g., 'info', 'error', 'debug').
   * @param message - The message to be logged.
   * @param payload - Optional additional data to provide context to the log.
   */
  log: (level: string, message: string, payload?: any): void => {
    winstonLogger.log(level, message, appendSource(payload));
  },
};

function appendSource(payload: any): Record<string, any> | undefined {
  try {
    const tenantId = RequestContext.getTenantId();
    const email = RequestContext.getUser()?.email;
    const userId = RequestContext.getUser()?.id;

    let source: Record<string, any> | undefined;

    if (tenantId || userId) {
      source = {
        tenantId,
        userId,
        email,
      };
    }

    if (payload !== undefined && typeof payload !== 'object') {
      payload = {
        value: payload,
      };
    }

    const logEntry = {
      ...payload,
      source,
      labels: {
        version,
      },
    };

    if (JSON.stringify(logEntry).length > loggingConfig.maxLogEntrySize) {
      logEntry.payload = {
        payloadExcluded: 'too large',
      };
    }
    return logEntry;
  } catch (err) {
    return payload;
  }
}

export function logError(
  errorOrMessage: Error | string | unknown,
  error?: Error | unknown,
): void {
  const message =
    typeof errorOrMessage === 'string' ? errorOrMessage : 'unknown_error';
  let payload = errorOrMessage;

  if (error) {
    if ((error as Error).stack) {
      payload = {
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          origin: error,
        },
      };
    }
  }
  logger.error(message, payload);
}

export default logger;
