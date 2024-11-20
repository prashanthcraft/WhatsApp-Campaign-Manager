import { Request } from 'express';

export interface RequestWithType<T> extends Request {
  body: T;
}

export interface RequestWithQuery<T = any>
  extends Request<unknown, unknown, unknown, T> {
  query: T;
}
