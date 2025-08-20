import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { templateItems } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  const body = await request.json();
  const update: any = {};
  for (const key of ['title','description','position','isRequired','estimatedDuration','reminderThreshold','assigneeRole']) {
    if (key in body) update[key] = body[key];
  }
  const [updated] = await db.update(templateItems).set(update).where(eq(templateItems.id, id)).returning();
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  await db.delete(templateItems).where(eq(templateItems.id, id));
  return NextResponse.json({ success: true });
}
