
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions as sessionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';

export async function POST() {
  try {
    const sessionTokenValue = (await cookies()).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

    if (sessionTokenValue) {
      // Delete session from database
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionTokenValue));
      console.log(`[API Logout] Session ${sessionTokenValue} deleted from DB.`);
    }

    // Clear the httpOnly cookie
    (await
      // Clear the httpOnly cookie
      cookies()).set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    console.error('API logout error:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
