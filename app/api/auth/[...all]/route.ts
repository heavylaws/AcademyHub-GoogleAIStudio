import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth/betterAuth';

export const { GET, POST } = toNextJsHandler(auth);
