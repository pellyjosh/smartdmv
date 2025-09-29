import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, asc, eq } from 'drizzle-orm';
import { templateItems, treatmentChecklistTemplates as templates } from '@/db/schema';

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  // Verify template belongs to practice
  const tpl = await tenantDb.select().from(templates).where(and(eq(templates.id, Number(body.templateId)), eq(templates.practiceId, Number(ctx.practiceId))));
  if (!tpl[0]) return NextResponse.json({ message: 'Template not found' }, { status: 404 });

  const [created] = await tenantDb.insert(templateItems).values({
    templateId: Number(body.templateId),
    title: body.title,
    description: body.description ?? null,
    position: Number(body.position) || 0,
    isRequired: Boolean(body.isRequired) || false,
    estimatedDuration: body.estimatedDuration != null ? Number(body.estimatedDuration) : null,
    reminderThreshold: body.reminderThreshold != null ? Number(body.reminderThreshold) : null,
    assigneeRole: body.assigneeRole ?? null,
  } as any).returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const id = Number(new URL(request.url).searchParams.get('id') || body.id);
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  // No practice check here since template relation would require join; keep minimal
  const update: any = {};
  for (const key of ['title','description','position','isRequired','estimatedDuration','reminderThreshold','assigneeRole']) {
    if (key in body) update[key] = body[key];
  }
  const [updated] = await tenantDb.update(templateItems).set(update).where(eq(templateItems.id, id)).returning();
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
