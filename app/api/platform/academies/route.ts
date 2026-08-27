import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { authFailure } from '@/lib/auth/authFailure';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const academies = await prisma.academy.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            memberships: true,
            athletes: true,
            assessments: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ academies });
  } catch (err) {
    console.error('Error listing platform academies:', err);
    return NextResponse.json({ error: 'Failed to list academies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requirePlatformAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const body = await request.json();
    const { name, slug } = body ?? {};

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const existingSlug = await prisma.academy.findUnique({
      where: { slug: slug.trim() },
    });
    if (existingSlug) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }

    const academy = await prisma.academy.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        isActive: true,
      },
    });

    await writeAuditLog({
      academyId: null, // platform-level action
      actorUserId: user.uid,
      action: 'ACADEMY_CREATED',
      targetType: 'Academy',
      targetId: academy.id,
    });

    return NextResponse.json({ academy }, { status: 201 });
  } catch (err) {
    console.error('Error creating platform academy:', err);
    return NextResponse.json({ error: 'Failed to create academy' }, { status: 500 });
  }
}
