import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

/**
 * Firebase Admin SDK Singleton for Server-Side Routes (Next.js API Routes / Webhooks).
 *
 * Authentication precedence:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY (env var containing raw JSON string of service account)
 * 2. GOOGLE_APPLICATION_CREDENTIALS / applicationDefault() (standard Google Cloud / local file path)
 */
if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (err) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON, falling back to applicationDefault():', err);
      initializeApp({
        credential: applicationDefault(),
      });
    }
  } else {
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

export const adminDb = getFirestore();
export default admin;
