/**
 * Cloud Function to assign RBAC custom claims and synchronize Firestore user profile.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * ---------------------------------------------------------------------------------
 * 1. Install Firebase CLI globally if needed:
 *    npm install -g firebase-tools
 *
 * 2. Log in and initialize functions if not already initialized in your project:
 *    firebase login
 *    firebase init functions
 *
 * 3. Ensure `firebase-admin` and `firebase-functions` are installed in the `functions/` directory:
 *    cd functions && npm install firebase-admin firebase-functions
 *
 * 4. Deploy only this function:
 *    firebase deploy --only functions:setUserRole
 * ---------------------------------------------------------------------------------
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const setUserRole = functions.https.onCall(async (data, context) => {
  // Security Gate: Ensure caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called by an authenticated user.'
    );
  }

  const callerRole = context.auth.token.role;
  // Admin guard: only existing admins can assign roles
  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can assign user roles.'
    );
  }

  const { uid, role } = data as { uid: string; role: 'admin' | 'coach' | 'parent' };

  if (!uid || !['admin', 'coach', 'parent'].includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid target UID and role (admin, coach, or parent) must be provided.'
    );
  }

  try {
    // 1. Set Custom Claims on Firebase Auth user (populates request.auth.token.role)
    await admin.auth().setCustomUserClaims(uid, { role });

    // 2. Synchronize /users/{uid} document in Firestore (populates getUserData().role)
    await admin.firestore().collection('users').doc(uid).set(
      {
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      message: `Role '${role}' successfully assigned to user ${uid}.`,
    };
  } catch (error: any) {
    console.error('Error assigning role:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to assign role.');
  }
});
