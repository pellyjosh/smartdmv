import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, desc, eq } from 'drizzle-orm';
import { treatmentChecklistTemplates as templates, users } from '@/db/schema';

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const rows = await tenantDb.select({
    id: templates.id,
    practiceId: templates.practiceId,
    name: templates.name,
    category: templates.category,
    description: templates.description,
    isActive: templates.isActive,
    autoAssignToDiagnosis: templates.autoAssignToDiagnosis,
    createdById: templates.createdById,
    createdAt: templates.createdAt,
    updatedAt: templates.updatedAt,
    createdByName: users.name,
  })
  .from(templates)
  .leftJoin(users, eq(templates.createdById, users.id))
  .where(and(eq(templates.practiceId, Number(ctx.practiceId)), eq(templates.isActive, true)))
  .orderBy(desc(templates.createdAt));

  const data = rows.map(r => ({
    ...r,
    createdByName: r.createdByName || 'Unknown'
  }));
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const insert = {
    practiceId: Number(ctx.practiceId),
    name: body.name,
    category: body.category,
    description: body.description ?? null,
    isActive: body.isActive ?? true,
    autoAssignToDiagnosis: body.autoAssignToDiagnosis ?? null,
    createdById: Number(ctx.userId),
  } as any;
  const [created] = await tenantDb.insert(templates).values(insert).returning();
  return NextResponse.json(created, { status: 201 });
}
