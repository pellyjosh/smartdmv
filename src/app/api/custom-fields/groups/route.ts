import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldGroups } from '@/db/schemas/customFieldsSchema';
import { and, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const data = await req.json();
    const { practiceId: rawPracticeId, categoryId: rawCategoryId, name, key, description } = data || {};
    const practiceId = typeof rawPracticeId === 'string' ? parseInt(rawPracticeId, 10) : rawPracticeId;
    const categoryId = typeof rawCategoryId === 'string' ? parseInt(rawCategoryId, 10) : rawCategoryId;

    if (!practiceId || !categoryId || !name || !key) {
      return NextResponse.json({ error: 'practiceId, categoryId, name, and key are required' }, { status: 400 });
    }

    const existing = await tenantDb.query.customFieldGroups.findFirst({
      where: and(eq(customFieldGroups.practiceId, practiceId), eq(customFieldGroups.key, key)),
    });
    if (existing) {
      return NextResponse.json({ error: 'Group with this key already exists' }, { status: 400 });
    }

    const inserted = await tenantDb.insert(customFieldGroups)
      .values({ practiceId, categoryId, name, key, description })
      .returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error('Create group error', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}