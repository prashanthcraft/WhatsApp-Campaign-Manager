import { compose, Next } from "compose-middleware";
import { Request, Response } from "express";
import { PrefixedFirebaseError } from "firebase-admin/lib/utils/error";
import jwt from "jsonwebtoken";
import { AccessDeniedError } from "rest-api-errors";
import { OAuth2Client } from "google-auth-library";
import { firebaseAuth } from "@config/firebaseConfig";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "your-credentials-secret-key";
export async function authMiddleware(req: Request, res: Response, next: Next) {
  try {
    // Extract the token and login type from the headers
    const authHeader = req.header("Authorization");
    const loginType = req.header("X-Login-Type");

    // const token = req.header('Authorization')?.split(' ')[1];
    // if (!token) return res.status(401).json({ message: 'Access denied' });

    // const verified = jwt.verify(token, process.env.JWT_SECRET as string);
    // req.user = verified;
    if (authHeader) {
      const [, token] = authHeader.split(/\s+/);
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
      };
    }
    // next();
  } catch (err) {
    switch ((err as PrefixedFirebaseError).code) {
      case "auth/id-token-expired":
        return next(new AccessDeniedError("token_expired"));
      case "auth/argument-error":
        return next(new AccessDeniedError("invalid_token"));
      default:
        return next(err as any);
    }
  }

  next();
}

export const authenticate = compose(authMiddleware);
