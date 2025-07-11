// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET a specific user by ID
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const userId = pathname.split('/').pop(); // Extract user ID from the URL path

  console.log('Pathname:', pathname);
  console.log('Extracted User ID:', userId);

  try {
    if (userId) {
      const userData = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userData.length === 0) {
        console.log('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(userData[0], { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
