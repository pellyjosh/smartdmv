// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, sessions, practices } from '@/db/schema'; // Assuming 'practices' schema exists
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';

// Zod schema for registration input validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  practiceId: z.string().min(1, "Practice ID is required."),
});

export async function POST(req: Request) {
  console.log('[API Register START] Received request to /api/auth/register');
  try {
    const body = await req.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API Register] Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, practiceId } = validationResult.data;

    // Check if a user with this email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      console.warn(`[API Register] Registration attempt for existing email: ${email}`);
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Check if the provided practiceId exists
    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, practiceId),
    });

    if (!practice) {
      console.warn(`[API Register] Registration attempt with non-existent practiceId: ${practiceId}`);
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log(`[API Register] Password hashed for email: ${email}`);

    // Create the new client user
    const [newUser] = await db.insert(users).values({
      id: `user_${crypto.randomUUID()}`,
      name,
      email,
      password: hashedPassword,
      role: 'CLIENT', // Create user as a CLIENT
      practiceId: practiceId, // Associate with the existing practice
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      practiceId: users.practiceId,
    });

    if (!newUser) {
      throw new Error("Failed to create new client user.");
    }
    console.log(`[API Register] Created new client: ${newUser.name} (${newUser.id}) for practice ${practice.id}`);

    console.log('[API Register SUCCESS] Registration successful.');
    // Return a success response without creating a session or setting a cookie
    return NextResponse.json({ user: newUser, message: 'Client created successfully' }, { status: 201 });

  } catch (error) {
    console.error('[API Register CATCH_ERROR] Error during registration:', error);
    return NextResponse.json({ error: 'Failed to register user due to an unexpected server error.' }, { status: 500 });
  }
}