import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Validate required environment variables
const serviceEnvFilePath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? '';
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!serviceEnvFilePath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

if (!databaseURL) {
  throw new Error('FIREBASE_DATABASE_URL environment variable is not set.');
}

// Utility function to read and parse the service account JSON file
function getServiceAccount(): admin.ServiceAccount {
  try {
    const serviceAccountPath = path.resolve(serviceEnvFilePath);
    const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
    return JSON.parse(serviceAccountContent);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    throw new Error('Service account is not available.');
  }
}

// Firebase App Initialization
function getFirebaseApp(): admin.app.App {
  if (!admin.apps.length) {
    console.log('Initializing Firebase app...');
    return admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
      databaseURL,
    });
  }
  console.log('Firebase app already initialized.');
  const app = admin.apps[0];
  if (!app) {
    throw new Error('Failed to retrieve the Firebase app instance.');
  }
  return app;
}

// Export Firebase Auth
const app = getFirebaseApp();
export const firebaseAuth = admin.auth(app);
