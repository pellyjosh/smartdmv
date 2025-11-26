import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldValues } from '@/db/schemas/customFieldsSchema';

export async function POST(req: Request) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const data = await req.json();
    const { practiceId: rawPracticeId, groupId: rawGroupId, value, label, isActive } = data || {};
    const practiceId = typeof rawPracticeId === 'string' ? parseInt(rawPracticeId, 10) : rawPracticeId;
    const groupId = typeof rawGroupId === 'string' ? parseInt(rawGroupId, 10) : rawGroupId;
    if (!practiceId || !groupId || !value || !label) {
      return NextResponse.json({ error: 'practiceId, groupId, value, and label are required' }, { status: 400 });
    }
    const inserted = await tenantDb.insert(customFieldValues)
      .values({ practiceId, groupId, value, label, isActive: isActive ?? true })
      .returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error('Create value error', error);
    return NextResponse.json({ error: 'Failed to create value' }, { status: 500 });
  }
}