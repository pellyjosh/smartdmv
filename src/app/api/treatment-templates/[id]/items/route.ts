import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, asc, eq } from 'drizzle-orm';
import { treatmentChecklistTemplates as templates, templateItems } from '@/db/schema';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const templateId = Number(resolvedParams.id);

  // Ensure template belongs to practice
  const tpl = await tenantDb.select().from(templates).where(and(eq(templates.id, templateId), eq(templates.practiceId, Number(ctx.practiceId))));
  if (!tpl[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const items = await tenantDb.select().from(templateItems).where(eq(templateItems.templateId, templateId)).orderBy(asc(templateItems.position));
  return NextResponse.json(items);
}
