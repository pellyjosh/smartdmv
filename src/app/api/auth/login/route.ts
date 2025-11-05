
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { getCurrentTenantDb, isCurrentRequestTenant } from '@/lib/tenant-db-resolver';
import { sessions as sessionsTable } from '@/db/schema';
import { cookies } from 'next/headers';
import { loginUserAction } from '@/actions/authActions';
import type { User } from '@/context/UserContext';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';
import { randomUUID } from 'crypto';

/**
 * Get the appropriate database instance based on current request context
 */
async function getContextualDb() {
  const isTenant = await isCurrentRequestTenant();
  
  if (isTenant) {
    console.log('[AUTH_API] Using tenant-specific database');
    return await getCurrentTenantDb();
  } else {
    console.log('[AUTH_API] Using default database (likely for development/fallback)');
    return db;
  }
}

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
    // Get the appropriate database for session management
    const contextualDb = await getContextualDb();
    
    // Session management
    const sessionTokenValue = randomUUID(); // This will be used as the session ID
    const sessionExpiresAtDate = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
    const isSqlite = process.env.DB_TYPE === 'sqlite';

    // Insert session with the UUID as the ID into the tenant-specific database
    await contextualDb.insert(sessionsTable).values({
      id: sessionTokenValue, // Use the UUID as the session ID
      userId: userData.id,
      expiresAt: isSqlite ? sessionExpiresAtDate.getTime() : sessionExpiresAtDate,
      data: JSON.stringify({}), // Store any additional session data here if needed
      // createdAt will be handled by DB default
    });

    const sessionId = sessionTokenValue;
    console.log('[AUTH_API] Session created successfully for user:', userData.id, 'with session ID:', sessionId);

    const cookieStore = await cookies();
    cookieStore.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, sessionId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      expires: sessionExpiresAtDate,
    });

    // Return the full user object to the client with session info for offline caching
    return NextResponse.json({ 
      user: userData, 
      message: 'Signed in successfully!',
      session: {
        id: sessionId,
        expiresAt: sessionExpiresAtDate.toISOString(),
        createdAt: new Date().toISOString(),
      }
    });

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
