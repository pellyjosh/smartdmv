import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET users for a specific practice (practice admin endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');
    const select = searchParams.get('select');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    let usersData;

    if (select) {
      // Parse the select parameter to determine which fields to return
      const fields = select.split(',').map(field => field.trim());
      const selectFields: any = {};
      
      if (fields.includes('id')) selectFields.id = users.id;
      if (fields.includes('name')) selectFields.name = users.name;
      if (fields.includes('email')) selectFields.email = users.email;
      if (fields.includes('role')) selectFields.role = users.role;
      if (fields.includes('username')) selectFields.username = users.username;

      usersData = await db
        .select(selectFields)
        .from(users)
        .where(eq(users.practiceId, parseInt(practiceId)));
    } else {
      // Return all user data with additional computed fields
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.practiceId, parseInt(practiceId)));

      usersData = allUsers.map(user => ({
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        status: 'active', // TODO: Add status field to users table
        lastLogin: undefined, // TODO: Add lastLoginAt field to users table
        createdAt: user.createdAt.toISOString(),
        practiceId: user.practiceId
      }));
    }

    return NextResponse.json(usersData);
  } catch (error) {
    console.error('Error fetching practice users:', error);
    return NextResponse.json({ error: 'Failed to fetch practice users' }, { status: 500 });
  }
}
