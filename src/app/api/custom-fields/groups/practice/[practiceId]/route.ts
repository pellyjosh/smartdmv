import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customFieldGroups } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: { practiceId: string; categoryId: string } }
) {
  try {
    const resolvedParams = await params;
    const { practiceId, categoryId } = resolvedParams;


    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    let groups;
    if (categoryId) {
      groups = await db.query.customFieldGroups.findMany({
        where: eq(customFieldGroups.categoryId, parseInt(categoryId)),
      });
    } else {
      groups = await db.query.customFieldGroups.findMany({
        where: eq(customFieldGroups.practiceId, practiceId),
      });
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.practiceId || !data.categoryId || !data.name || !data.key) {
      return NextResponse.json(
        { error: 'Practice ID, category ID, name, and key are required' },
        { status: 400 }
      );
    }

    // Check for existing group with the same key in the same practice
    const existingGroup = await db.query.customFieldGroups.findFirst({
      where: eq(customFieldGroups.key, data.key),
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group with this key already exists' },
        { status: 400 }
      );
    }

    const newGroup = await db.insert(customFieldGroups).values(data).returning();

    return NextResponse.json(newGroup[0], { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

// Note: Ensure that your database schema and connection are correctly configured in `db.ts`.
// Also, make sure that data validation and error handling are implemented according to your application's needs.
