
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users as usersTable, sessions as sessionsTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { User as AuthUser, AdministratorUser, PracticeAdminUser, ClientUser } from '@/hooks/useAuth'; // Use the detailed User type from useAuth

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

    const userRecord = await db.query.users.findFirst({
      where: eq(usersTable.email, email),
    });

    if (!userRecord || !userRecord.password) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(inputPassword, userRecord.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Construct the full user object based on role
    let userData: AuthUser;

    if (userRecord.role === 'ADMINISTRATOR') {
      const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
        .from(adminPracticesTable)
        .where(eq(adminPracticesTable.administratorId, userRecord.id));
      
      const accessiblePracticeIds = adminPractices.map(p => p.practiceId);
      let currentPracticeId = userRecord.currentPracticeId;

      if (!currentPracticeId && accessiblePracticeIds.length > 0) {
        currentPracticeId = accessiblePracticeIds[0];
      } else if (!currentPracticeId && accessiblePracticeIds.length === 0) {
        console.warn(`[API Login] Administrator ${userRecord.email} has no current or accessible practices configured.`);
        currentPracticeId = 'practice_NONE'; // Fallback or handle as error
      }

      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds,
        currentPracticeId: currentPracticeId!,
      };
    } else if (userRecord.role === 'PRACTICE_ADMINISTRATOR') {
      if (!userRecord.practiceId) {
        // This should ideally not happen if data integrity is maintained
        return NextResponse.json({ error: 'Practice Administrator is not associated with a practice.' }, { status: 500 });
      }
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        role: 'PRACTICE_ADMINISTRATOR',
        practiceId: userRecord.practiceId,
      };
    } else if (userRecord.role === 'CLIENT') {
      if (!userRecord.practiceId) {
        // This should ideally not happen
        return NextResponse.json({ error: 'Client is not associated with a practice.' }, { status: 500 });
      }
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        role: 'CLIENT',
        practiceId: userRecord.practiceId,
      };
    } else {
      return NextResponse.json({ error: 'Unknown user role.' }, { status: 500 });
    }

    // Session management
    const sessionToken = crypto.randomUUID();
    const sessionExpiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry as Date object
    const isSqlite = process.env.DB_TYPE === 'sqlite';

    await db.insert(sessionsTable).values({
      id: sessionToken,
      userId: userRecord.id,
      // Conditionally format expiresAt: number for SQLite (ms), Date object for PG
      expiresAt: isSqlite ? sessionExpiresAtDate.getTime() : sessionExpiresAtDate,
      // data: text('data'), // 'data' column can be used to store additional session info if needed
      // Let createdAt be handled by database default
    });

    cookies().set('session_token', sessionToken, { // This is the server-set HttpOnly cookie
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
      sameSite: 'lax',
      expires: sessionExpiresAtDate, // 'expires' attribute for cookie expects a Date object
    });

    return NextResponse.json({ user: userData, message: 'Signed in successfully!' });

  } catch (error) {
    console.error('API login error:', error); // This log will show the specific error on the server
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
