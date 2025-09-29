import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { assignedChecklists, checklistItems, pets, users } from '@/db/schema';

// For clients: return only their pets' checklists within the practice
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // Find client's pets in practice
  const clientId = Number(ctx.userId);
  const petRows = await tenantDb.select().from(pets).where(and(eq(pets.ownerId, clientId), eq(pets.practiceId, Number(ctx.practiceId))));
  const petIds = petRows.map(p => p.id as number);

  const lists = petIds.length ? await tenantDb.select().from(assignedChecklists)
    .where(inArray(assignedChecklists.petId as any, petIds as any))
    .orderBy(desc(assignedChecklists.createdAt)) : [];

  const checklistIds = lists.map(l => l.id as number);
  const items = checklistIds.length ? await tenantDb.select().from(checklistItems).where(inArray(checklistItems.checklistId as any, checklistIds as any)) : [];
  const itemsByChecklist = items.reduce<Record<number, any[]>>((acc, it: any) => {
    (acc[it.checklistId as number] ||= []).push(it); return acc;
  }, {});

  const petMap = new Map<number, any>();
  petRows.forEach(p => petMap.set(p.id as number, p));

  const result = lists.map(l => ({
    ...l,
    petName: petMap.get(l.petId as number)?.name,
    petSpecies: petMap.get(l.petId as number)?.species,
    items: (itemsByChecklist[l.id as number] || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }));

  return NextResponse.json(result);
}
