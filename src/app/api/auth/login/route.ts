
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { sessions as sessionsTable } from '@/db/schema';
import { cookies } from 'next/headers';
import { loginUserAction } from '@/actions/authActions';
import type { User } from '@/context/UserContext';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';

const SignInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = SignInSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { email, password: inputPassword } = validationResult.data;

    // Call the server action for the core logic
    // This action will throw an error if login fails (user not found, wrong password, practice association issue)
    const userData = await loginUserAction(email, inputPassword);

    // If loginUserAction is successful, userData is populated.
    // Session management
    const sessionTokenValue = crypto.randomUUID(); // This will be stored in session data
    const sessionExpiresAtDate = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
    const isSqlite = process.env.DB_TYPE === 'sqlite';

    // Insert session and get the auto-generated ID
    const insertResult = await (db as any).insert(sessionsTable).values({
      // Don't set id - let database auto-generate it
      userId: userData.id,
      expiresAt: isSqlite ? sessionExpiresAtDate.getTime() : sessionExpiresAtDate,
      data: JSON.stringify({ originalToken: sessionTokenValue }), // Store original UUID as backup
      // createdAt will be handled by DB default
    }).returning({ sessionId: sessionsTable.id });

    const sessionId = insertResult[0].sessionId;
    console.log('Session created successfully for user:', userData.id, 'with session ID:', sessionId);

    const cookieStore = await cookies();
    cookieStore.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, sessionId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      expires: sessionExpiresAtDate,
    });

    // Return the full user object to the client
    return NextResponse.json({ user: userData, message: 'Signed in successfully!' });

  } catch (error) {
    console.error('API login error details:');
    if (error instanceof Error) {
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
    } else {
        console.error('Caught a non-Error object:', error);
    }

    // Check for specific error messages from loginUserAction
    if (error instanceof Error && 
        (error.message.includes('User not found') || 
         error.message.includes('Invalid credentials') || 
         error.message.includes('not associated with a practice') ||
         error.message.includes('Unknown user role'))) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    // Log that we are falling through to the generic error
    console.error('API login error is not a specific known auth error. Returning generic 500.');
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
