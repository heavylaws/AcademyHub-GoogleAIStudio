import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          ok: false,
          service: 'academyhub',
          status: 'degraded',
          database: 'missing-database-url',
          environment: process.env.NODE_ENV ?? 'development',
          uptimeMs: Date.now() - startedAt,
        },
        { status: 503 }
      );
    }

    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: 'academyhub',
      status: 'healthy',
      database: 'connected',
      environment: process.env.NODE_ENV ?? 'development',
      uptimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('Health check failed', error);
    return NextResponse.json(
      {
        ok: false,
        service: 'academyhub',
        status: 'degraded',
        database: 'unavailable',
        environment: process.env.NODE_ENV ?? 'development',
        uptimeMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }
}
