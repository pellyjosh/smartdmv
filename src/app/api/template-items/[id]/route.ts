import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { eq } from 'drizzle-orm';
import { templateItems } from '@/db/schema';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id: idString } = await params;
  const id = Number(idString);
  const body = await request.json();
  const update: any = {};
  for (const key of ['title','description','position','isRequired','estimatedDuration','reminderThreshold','assigneeRole']) {
    if (key in body) update[key] = body[key];
  }
  const [updated] = await tenantDb.update(templateItems).set(update).where(eq(templateItems.id, id)).returning();
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id: idString } = await params;
  const id = Number(idString);
  await tenantDb.delete(templateItems).where(eq(templateItems.id, id));
  return NextResponse.json({ success: true });
}
