import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import '@/lib/firebaseAdmin';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { AuthError } from '@/lib/auth/types';
import { prisma } from '@/lib/prisma';

const roleMap = {
  admin: 'ADMIN',
  coach: 'COACH',
  parent: 'PARENT',
} as const;

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await verifyRequestAuth(request);
    const uid = user.uid;
    const email = user.email || 'unknown@example.com';
    const displayName = user.claims?.name || user.claims?.displayName || null;

    const role = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { id: uid } });

      if (existingUser) {
        const existingRole = String(existingUser.role).toLowerCase();
        const normalizedRole = existingRole === 'admin' || existingRole === 'coach' || existingRole === 'parent'
          ? existingRole
          : 'parent';

        await getAuth().setCustomUserClaims(uid, { role: normalizedRole });
        return normalizedRole as 'admin' | 'coach' | 'parent';
      }

      const count = await tx.user.count();
      const nextRole = count === 0 ? 'admin' : 'parent';

      await tx.user.create({
        data: {
          id: uid,
          email,
          displayName: displayName ?? null,
          role: roleMap[nextRole],
        },
      });

      await getAuth().setCustomUserClaims(uid, { role: nextRole });
      return nextRole;
    });

    return NextResponse.json({ role });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Bootstrap user record failed:', error);
    return NextResponse.json({ error: 'Failed to bootstrap user record' }, { status: 500 });
  }
}
