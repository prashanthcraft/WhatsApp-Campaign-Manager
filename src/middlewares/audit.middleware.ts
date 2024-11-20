import logger from '@utils/logger';
import { NextFunction, Request, Response } from 'express';

import _ = require('lodash');

export async function logRequest(
  req: Request,
  resp: Response,
  next: NextFunction,
) {
  let params: any;
  if (req.body) {
    params = _.cloneDeep(req.body);
    const passwordKeys = Object.keys(params).filter((key) =>
      /password/i.test(key),
    );
    passwordKeys.forEach((key) => {
      params[key] = '**********';
    });
  }
  logger.debug(`${req.method} ${req.originalUrl}`, {
    params,
  });
  next();
}
