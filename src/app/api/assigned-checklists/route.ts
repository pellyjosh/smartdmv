import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { assignedChecklists, checklistItems, pets, templateItems, treatmentChecklistTemplates as templates, users } from '@/db/schema';

export async function GET(request: NextRequest) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // Fetch checklists for practice with pet info and items
  const lists = await db.select().from(assignedChecklists)
    .where(eq(assignedChecklists.practiceId, Number(ctx.practiceId)))
    .orderBy(desc(assignedChecklists.createdAt));

  // Enrich with pet details and items
  const petMap = new Map<number, any>();
  const petIds = Array.from(new Set(lists.map(l => l.petId).filter(Boolean))) as number[];
  if (petIds.length) {
    const petRows = await db.select().from(pets).where(inArray(pets.id as any, petIds as any));
    petRows.forEach(p => petMap.set(p.id as unknown as number, p));
  }

  const checklistIds = lists.map(l => l.id as number);
  const items = checklistIds.length 
    ? await db.select().from(checklistItems).where(inArray(checklistItems.checklistId as any, checklistIds as any)) 
    : [];
  const itemsByChecklist = items.reduce<Record<number, any[]>>((acc, it: any) => {
    const cid = it.checklistId as number; (acc[cid] ||= []).push(it); return acc;
  }, {});

  const result = lists.map(l => {
    const pet = petMap.get(l.petId as number);
    return {
      ...l,
      petName: pet?.name,
      petSpecies: pet?.species,
      items: (itemsByChecklist[l.id as number] || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    };
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const [created] = await db.insert(assignedChecklists).values({
    practiceId: Number(ctx.practiceId),
    petId: Number(body.petId),
    templateId: body.templateId ? Number(body.templateId) : null,
    appointmentId: body.appointmentId ? Number(body.appointmentId) : null,
    soapNoteId: body.soapNoteId ? Number(body.soapNoteId) : null,
    name: body.name,
    status: body.status ?? 'pending',
    priority: body.priority ?? 'medium',
  dueDate: body.dueDate ? new Date(body.dueDate) : null,
    assignedById: Number(ctx.userId),
    assignedToId: body.assignedToId ? Number(body.assignedToId) : null,
    notes: body.notes ?? null,
  } as any).returning();

  // If template provided, copy items
  if (created && created.templateId) {
    const items = await db.select().from(templateItems).where(eq(templateItems.templateId, created.templateId as number)).orderBy(asc(templateItems.position));
    if (items.length) {
      await db.insert(checklistItems).values(items.map((it, idx) => ({
        checklistId: created.id as number,
        title: it.title,
        description: it.description,
        position: it.position ?? idx + 1,
        isRequired: it.isRequired ?? false,
        estimatedDuration: it.estimatedDuration ?? null,
        reminderThreshold: it.reminderThreshold ?? null,
        assigneeRole: it.assigneeRole ?? null,
        completed: false,
      })) as any);
    }
  }

  return NextResponse.json(created, { status: 201 });
}
