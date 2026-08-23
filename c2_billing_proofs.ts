import { NextRequest } from 'next/server';
import { GET as getInvoices, POST as postInvoice } from './app/api/invoices/route';
import { GET as getInvoiceById, PATCH as patchInvoice } from './app/api/invoices/[id]/route';
import { auth } from './lib/auth/betterAuth';
import { prisma } from './lib/prisma';

// Intercept getSession for test session tokens
(auth.api as any).getSession = async ({ headers }: { headers: Headers }) => {
  const cookie = headers.get('cookie') || '';
  if (cookie.includes('token_admin_c2')) {
    return { user: { id: 'user_admin_c2' } };
  }
  return null;
};

async function main() {
  process.env.BILLING_ENABLED = 'false';

  // Seed user & membership for user_admin_c2
  await prisma.membership.deleteMany({ where: { userId: 'user_admin_c2' } });
  await prisma.user.deleteMany({ where: { id: 'user_admin_c2' } });

  const acad = await prisma.academy.findFirst();
  const acadId = acad ? acad.id : 'acad_c2_demo';

  if (!acad) {
    await prisma.academy.create({
      data: { id: acadId, name: 'C2 Demo Academy', slug: 'c2-demo', isActive: true },
    });
  }

  await prisma.user.create({
    data: { id: 'user_admin_c2', email: 'admin_c2@example.com', displayName: 'Admin C2' },
  });

  await prisma.membership.create({
    data: { userId: 'user_admin_c2', academyId: acadId, role: 'ADMIN' },
  });

  await prisma.invoice.create({
    data: {
      id: 'inv_c2_dummy',
      academyId: acadId,
      parentUserId: 'user_admin_c2',
      parentEmail: 'admin_c2@example.com',
      parentName: 'Admin C2',
      subtotal: 100,
      netTotal: 100,
      paymentStatus: 'PENDING',
      paymentSchedule: 'UPFRONT',
      issuedDate: new Date().toISOString(),
    },
  });

  function makeReq(url: string, token?: string, method = 'GET', body?: unknown) {
    const headers: Record<string, string> = {};
    if (token) {
      headers['cookie'] = `better-auth.session_token=${token}`;
    }
    if (body) {
      headers['content-type'] = 'application/json';
    }
    return new NextRequest(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  console.log('=== VERIFICATION 4: 4 Invoice Routes Authenticated with BILLING_ENABLED=false ===');

  {
    const req = makeReq('http://localhost:3000/api/invoices', 'token_admin_c2', 'GET');
    const res = await getInvoices(req);
    console.log(`GET /api/invoices -> Status: ${res.status}`);
    console.log(`Body:`, await res.json());
  }

  {
    const req = makeReq('http://localhost:3000/api/invoices', 'token_admin_c2', 'POST', { parentName: 'Test Parent' });
    const res = await postInvoice(req);
    console.log(`POST /api/invoices -> Status: ${res.status}`);
    console.log(`Body:`, await res.json());
  }

  {
    const req = makeReq('http://localhost:3000/api/invoices/inv_c2_dummy', 'token_admin_c2', 'GET');
    const res = await getInvoiceById(req, { params: Promise.resolve({ id: 'inv_c2_dummy' }) });
    console.log(`GET /api/invoices/[id] -> Status: ${res.status}`);
    console.log(`Body:`, await res.json());
  }

  {
    const req = makeReq('http://localhost:3000/api/invoices/inv_c2_dummy', 'token_admin_c2', 'PATCH', { payment_status: 'paid' });
    const res = await patchInvoice(req, { params: Promise.resolve({ id: 'inv_c2_dummy' }) });
    console.log(`PATCH /api/invoices/[id] -> Status: ${res.status}`);
    console.log(`Body:`, await res.json());
  }

  console.log('\n=== VERIFICATION 5: Unauthenticated request with BILLING_ENABLED=false ===');
  {
    const req = makeReq('http://localhost:3000/api/invoices', undefined, 'GET');
    const res = await getInvoices(req);
    console.log(`GET /api/invoices (Unauthenticated) -> Status: ${res.status}`);
    console.log(`Body:`, await res.json());
  }

  // Cleanup
  await prisma.invoice.deleteMany({ where: { id: 'inv_c2_dummy' } });
  await prisma.membership.deleteMany({ where: { userId: 'user_admin_c2' } });
  await prisma.user.deleteMany({ where: { id: 'user_admin_c2' } });
  await prisma.$disconnect();
}

main().catch(console.error);
