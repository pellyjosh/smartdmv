import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldCategories } from '@/db/schemas/customFieldsSchema';
import { and, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const data = await req.json();
    const { practiceId: rawPracticeId, name, description } = data || {};

    const practiceId = typeof rawPracticeId === 'string' ? parseInt(rawPracticeId, 10) : rawPracticeId;

    if (!practiceId || !name) {
      return NextResponse.json({ error: 'practiceId and name are required' }, { status: 400 });
    }

    const existing = await tenantDb.query.customFieldCategories.findFirst({
      where: and(eq(customFieldCategories.practiceId, practiceId), eq(customFieldCategories.name, name)),
    });
    if (existing) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    const inserted = await tenantDb.insert(customFieldCategories).values({ practiceId, name, description }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error('Create category error', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}