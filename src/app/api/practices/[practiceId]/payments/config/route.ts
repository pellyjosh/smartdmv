import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Simple admin endpoint to get/update practice payment provider config.
// NOTE: This is a helper for development and should be hardened in production (encryption, audit, validation).

export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { practiceId: practiceIdParam } = await params;
  const practiceId = parseInt(practiceIdParam);
  if (user.practiceId !== practiceId && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMINISTRATOR') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const db = await getCurrentTenantDb();
  const practice = await db.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, practiceId) });
  if (!practice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ paymentProviders: (practice as any).paymentProviders || null, paymentEnabled: (practice as any).paymentEnabled || false });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { practiceId: practiceIdParam } = await params;
  const practiceId = parseInt(practiceIdParam);
  if (user.practiceId !== practiceId && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMINISTRATOR') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  const { paymentProviders, paymentEnabled } = body;

  const db = await getCurrentTenantDb();
  await db.update(practices).set({ paymentProviders, paymentEnabled }).where(eq(practices.id, practiceId));

  return NextResponse.json({ message: 'Payment config updated' });
}
