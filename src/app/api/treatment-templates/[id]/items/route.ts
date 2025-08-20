import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, asc, eq } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { treatmentChecklistTemplates as templates, templateItems } from '@/db/schema';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const templateId = Number(params.id);

  // Ensure template belongs to practice
  const tpl = await db.select().from(templates).where(and(eq(templates.id, templateId), eq(templates.practiceId, Number(ctx.practiceId))));
  if (!tpl[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const items = await db.select().from(templateItems).where(eq(templateItems.templateId, templateId)).orderBy(asc(templateItems.position));
  return NextResponse.json(items);
}
