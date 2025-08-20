import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { checklistItems } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const [created] = await db.insert(checklistItems).values({
    checklistId: Number(body.checklistId),
    title: body.title,
    description: body.description ?? null,
    priority: body.priority ?? null,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    position: body.position ?? 0,
    isRequired: body.isRequired ?? false,
    estimatedDuration: body.estimatedDuration ?? null,
    reminderThreshold: body.reminderThreshold ?? null,
    assigneeRole: body.assigneeRole ?? null,
    assignedToId: body.assignedToId ?? null,
  } as any).returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const id = Number(new URL(request.url).searchParams.get('id') || body.id);
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  const update: any = {};
  for (const key of ['title','description','priority','dueDate','completed','completedAt','completedById','assignedToId','notes','position','isRequired','estimatedDuration','reminderThreshold','assigneeRole']) {
    if (key in body) update[key] = body[key];
  }
  
  // Handle Date fields properly
  if ('dueDate' in update && update.dueDate) {
    update.dueDate = new Date(update.dueDate);
  }
  if ('completedAt' in update && update.completedAt) {
    update.completedAt = new Date(update.completedAt);
  }
  const [updated] = await db.update(checklistItems).set(update).where(eq(checklistItems.id, id)).returning();
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
