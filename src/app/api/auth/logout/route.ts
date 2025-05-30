
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions as sessionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';

export async function POST() {
  console.log('[API Logout START] Received request to /api/auth/logout');
  try {
    const sessionTokenValue = (await cookies()).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

    if (sessionTokenValue) {
      // Delete session from database
      console.log(`[API Logout] Attempting to delete session ${sessionTokenValue} from DB.`);
      const deleteResult = await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionTokenValue)).returning({ id: sessionsTable.id });
      if (deleteResult.length > 0) {
        console.log(`[API Logout] Session ${sessionTokenValue} deleted successfully from DB.`);
      } else {
        console.warn(`[API Logout] Session ${sessionTokenValue} not found in DB for deletion, or already deleted.`);
      }
    } else {
      console.log('[API Logout] No httpOnly session token found in request cookies to clear.');
    }

    // Clear the httpOnly cookie by setting its expiration to the past / maxAge to 0
    console.log('[API Logout] Clearing httpOnly session token cookie.');
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
      path: '/',
      sameSite: 'lax',
    });
    console.log('[API Logout SUCCESS] Logout successful, cookie clearing instruction sent.');
    return response;

  } catch (error) {
    console.error('[API Logout CATCH_ERROR] Error during logout:', error);
    return NextResponse.json({ error: 'Failed to logout due to an unexpected server error.' }, { status: 500 });
  }
}
