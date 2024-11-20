// tenant middleware for tenant based operations
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
