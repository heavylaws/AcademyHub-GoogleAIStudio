import { NextResponse } from 'next/server';
import { AuthError } from './types';

/**
 * Standard auth error response handler for API routes.
 *
 * Handles the 409 multi-membership case by including the academies list
 * in the response body, enabling the client selector UI.
 */
export function authFailure(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    const body: Record<string, unknown> = { error: err.message };

    // If the error carries an academies list (409 multi-membership), include it
    const academies = (err as AuthError & { academies?: unknown[] }).academies;
    if (academies) {
      body.academies = academies;
    }

    return NextResponse.json(body, { status: err.statusCode });
  }

  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}
