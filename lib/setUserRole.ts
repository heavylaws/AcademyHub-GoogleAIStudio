/**
 * Client-side helper for setting user roles.
 *
 * NOTE: Custom user claims (request.auth.token.role) CANNOT be set client-side
 * for security reasons. They must be set via the Firebase Admin SDK in a secure
 * environment such as Firebase Cloud Functions.
 *
 * See `functions/setUserRole.ts` for the backend implementation.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

export interface SetUserRoleParams {
  uid: string;
  role: 'admin' | 'coach' | 'parent';
}

export interface SetUserRoleResponse {
  success: boolean;
  message: string;
}

export async function setUserRole(params: SetUserRoleParams): Promise<SetUserRoleResponse> {
  try {
    const functions = getFunctions(app);
    const setUserRoleCallable = httpsCallable<SetUserRoleParams, SetUserRoleResponse>(
      functions,
      'setUserRole'
    );
    const result = await setUserRoleCallable(params);
    return result.data;
  } catch (error: any) {
    console.error('Failed to call setUserRole Cloud Function:', error);
    throw error;
  }
}
