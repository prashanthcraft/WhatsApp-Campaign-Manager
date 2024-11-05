import { OAuth2Client } from 'google-auth-library';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response } from 'express';
import { firebaseAuth } from '@config/firebaseConfig';

interface CustomRequest extends Request {
  user?: any;
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'your-credentials-secret-key';

// Heartbeat API to refresh token
export const heartbeat = async (req: CustomRequest, res: Response) => {
  try {
    const authHeader = req.header('Authorization');
    const loginType = req.header('X-Login-Type'); // 'google' or 'credentials'

    if (!authHeader) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    if (!loginType) {
      return res.status(400).json({ message: 'Access denied. No login type provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access denied. Malformed authorization header.' });
    }

    let user;
    let isGoogleToken = false;

    if (loginType === 'credentials') {
      // Verify the token as JWT
      try {
        user = jwt.verify(token, JWT_SECRET) as JwtPayload;
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError);
        return res.status(400).json({ message: 'Invalid JWT token.' });
      }
    } else if (loginType === 'google') {
      // Verify the token as Google ID token
      try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        user = {
          id: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name,
        };
        isGoogleToken = true;
      } catch (googleError) {
        console.error('Error verifying Google ID token:', googleError);
        return res.status(400).json({ message: 'Invalid Google ID token.' });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported login type.' });
    }

    // Determine user activity state (active or idle) from query parameter
    const userActivityState = req.query.userActivityState as string || 'idle'; // Expecting 'active' or 'idle' from client

    // Calculate session timeout (e.g., remaining time before expiration)
    const sessionToTimeout = isGoogleToken ? 3600 : 3600; // In seconds, adjust based on actual token expiry logic
    let newToken;

    // Refresh the token if user is active and the session is nearing expiration (e.g., less than 10 minutes remaining)
    if (userActivityState === 'active') {
      const decoded = jwt.decode(token, { complete: true }) as { payload: JwtPayload } | null;
      const exp = decoded?.payload?.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      if (exp && exp - currentTime < 600) { // Less than 10 minutes remaining
        newToken = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
      }
    }

    res.json({
      status: 'success',
      session_to_timeout: sessionToTimeout,
      user_state: userActivityState,
      login_type: loginType,
      token: newToken || undefined,
    });
  } catch (error) {
    console.error('Error in heartbeat API:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
