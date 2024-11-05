// tenant middleware for tenant based operations
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
