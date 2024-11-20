import { NextFunction, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware for verifying Google ID Token
export const googleAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: 'Access denied. Malformed authorization header.' });
    }

    // Verify the token using Google Auth Library
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });

    // Get the payload from the ticket
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    // Attach user information to the request object
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    res.status(400).json({ message: 'Invalid token.' });
  }
};
