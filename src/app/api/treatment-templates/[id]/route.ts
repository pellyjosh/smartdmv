import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, eq } from 'drizzle-orm';
import { treatmentChecklistTemplates as templates } from '@/db/schema';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const id = Number(resolvedParams.id);
  const rows = await tenantDb.select().from(templates)
    .where(and(eq(templates.practiceId, Number(ctx.practiceId)), eq(templates.id, id)));
  if (!rows[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const id = Number(resolvedParams.id);
  const body = await request.json();
  const update: any = {
    name: body.name,
    category: body.category,
    description: body.description ?? null,
    isActive: body.isActive ?? true,
    autoAssignToDiagnosis: body.autoAssignToDiagnosis ?? null,
  };
  const [updated] = await tenantDb.update(templates).set(update).where(and(eq(templates.id, id), eq(templates.practiceId, Number(ctx.practiceId)))).returning();
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const id = Number(resolvedParams.id);
  await tenantDb.delete(templates).where(and(eq(templates.id, id), eq(templates.practiceId, Number(ctx.practiceId))));
  return NextResponse.json({ success: true });
}
