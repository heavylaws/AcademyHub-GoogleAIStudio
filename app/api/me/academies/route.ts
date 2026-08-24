import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/betterAuth';
import { AuthError } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/academies
 *
 * Returns the authenticated user's academy memberships.
 * This route resolves the session directly — it does NOT go through
 * verifyRequestAuth, because it needs to work without an X-Academy-Id
 * header (it's the route that tells the client which academies are
 * available to select from).
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Missing authentication session' },
        { status: 401 },
      );
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id },
      select: {
        academyId: true,
        role: true,
        academy: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const academies = memberships.map((m) => ({
      id: m.academy.id,
      name: m.academy.name,
      slug: m.academy.slug,
      role: m.role ? String(m.role).toLowerCase() : 'none',
    }));

    return NextResponse.json({ academies });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching user academies:', error);
    return NextResponse.json({ error: 'Failed to fetch academies' }, { status: 500 });
  }
}
