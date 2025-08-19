// src/app/api/users/routes.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, UserRoleEnum } from '@/db/schema'; // Import UserRoleEnum
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// GET all users, users by practiceId, or a specific user by ID
export async function GET(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const practiceIdParam = searchParams.get('practiceId');
  const userIdParam = pathname.split('/').pop(); // Extract user ID from the URL path if present
  const practiceId = practiceIdParam ? parseInt(practiceIdParam, 10) : undefined;
  const userId = userIdParam && userIdParam !== 'users' ? parseInt(userIdParam, 10) : undefined;

  console.log('Pathname:', pathname);
  console.log('Extracted User ID:', userId);

  try {
    if (Number.isFinite(userId as number)) {
      const userData = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userData.length === 0) {
        console.log('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(userData[0], { status: 200 });
    }

    let usersData;
    if (Number.isFinite(practiceId as number)) {
      usersData = await db.select().from(users).where(eq(users.practiceId, practiceId as number));
    } else {
      usersData = await db.select().from(users);
    }
    return NextResponse.json(usersData, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Create a new user (registration)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum([UserRoleEnum.CLIENT, UserRoleEnum.ADMINISTRATOR, UserRoleEnum.PRACTICE_ADMINISTRATOR]).default(UserRoleEnum.CLIENT), // Use the enum
      practiceId: z.string(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      emergencyContactRelationship: z.string().optional(),
    });

    const validatedData = userSchema.parse(body);

    // Check for existing user with same email or username
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.email, validatedData.email),
        eq(users.username, validatedData.username),
      )
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email or username already exists" }, { status: 400 });
    }

    const [newUser] = await db.insert(users).values(validatedData).returning();
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
