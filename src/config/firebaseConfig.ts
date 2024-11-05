// src/firebaseConfig.ts
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? '');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

// admin.initializeApp();

export const firebaseAuth = admin.auth();
