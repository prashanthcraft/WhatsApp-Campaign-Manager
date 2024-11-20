import { RequestContext } from '@utils/requestContext';
import { NextFunction, Request, Response } from 'express';
import { pathToRegexp } from 'path-to-regexp';
import { UnauthorizedError } from 'rest-api-errors';

export default function requireTenantAccess(excludedRoutes: string[] = []) {
  const { regexp } = pathToRegexp(excludedRoutes);

  return async (req: Request, resp: Response, next: NextFunction) => {
    if (RequestContext.getTenantId() || regexp.test(req.url)) {
      return next();
    }
    next(new UnauthorizedError('missing_tenant_id'));
  };
}
