
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users as usersTable, sessions as sessionsTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq, gt } from 'drizzle-orm'; // Import gt for greater than comparison
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext'; 

export async function GET(request: Request) {
  console.log('[API ME START] Received request to /api/auth/me');
  const sessionTokenValue =  (await cookies()).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

  if (!sessionTokenValue) {
    console.log('[API ME] No httpOnly session token found. Returning null.');
    return NextResponse.json(null, { status: 200 }); 
  }
  console.log('[API ME] Found httpOnly session token (value logged as ****** for security)');

  try {
    // For SQLite, expiresAt is a number (milliseconds), for PG it's a Date object.
    // The DB query doesn't need the current time for the initial fetch.
    const session = await db.query.sessions.findFirst({
      where: eq(sessionsTable.id, sessionTokenValue)
    });

    if (!session) {
      console.log(`[API ME] Session ID from cookie not found in DB: ${sessionTokenValue}. Clearing cookie.`);
      const response = NextResponse.json(null, { status: 200 });
      response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }
    console.log('[API ME] Session found in DB for token:', session.id);

    const sessionExpiresAt = typeof session.expiresAt === 'number' 
                             ? session.expiresAt // SQLite stores as number (milliseconds)
                             : new Date(session.expiresAt).getTime(); // PG stores as Date, convert to ms
    const currentTime = Date.now();

    if (sessionExpiresAt < currentTime) {
      console.log(`[API ME] Session expired. ExpiresAt_ms: ${sessionExpiresAt}, CurrentTime_ms: ${currentTime}. Deleting session and clearing cookie.`);
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionTokenValue));
      const response = NextResponse.json(null, { status: 200 });
      response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }
    console.log('[API ME] Session is valid and not expired.');

    const userRecord = await db.query.users.findFirst({
      where: eq(usersTable.id, session.userId),
    });

    if (!userRecord) {
      console.error(`[API ME] User not found for session ID: ${sessionTokenValue}, userId: ${session.userId}. Deleting orphaned session and clearing cookie.`);
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionTokenValue));
      const response = NextResponse.json(null, { status: 200 });
      response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }
    console.log('[API ME] User record found for session:', userRecord.email);

    let userData: User;

    if (userRecord.role === 'ADMINISTRATOR') {
      const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
        .from(adminPracticesTable)
        .where(eq(adminPracticesTable.administratorId, userRecord.id));
      
      const accessiblePracticeIds = adminPractices.map(p => p.practiceId);
      let currentPracticeId = userRecord.currentPracticeId;

      if (accessiblePracticeIds.length === 0) {
         console.warn(`[API ME] Administrator ${userRecord.email} has no accessible practices. Setting currentPracticeId to 'practice_NONE'.`);
         currentPracticeId = 'practice_NONE'; 
      } else if (!currentPracticeId || !accessiblePracticeIds.includes(currentPracticeId)) {
        // If currentPracticeId is null/undefined OR not in the accessible list, default to the first accessible one.
        console.warn(`[API ME] Administrator ${userRecord.email}'s currentPracticeId (${currentPracticeId}) is invalid or not set. Defaulting to first accessible: ${accessiblePracticeIds[0]}.`);
        currentPracticeId = accessiblePracticeIds[0];
      }

      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds,
        currentPracticeId: currentPracticeId!, // Should be guaranteed to be set now
      };
    } else if (userRecord.role === 'PRACTICE_ADMINISTRATOR') {
      if (!userRecord.practiceId) {
         console.warn(`[API ME] Practice Administrator ${userRecord.email} is not associated with a practice. Returning null.`);
         // Potentially clear cookie if this is an invalid state
         const response = NextResponse.json(null, { status: 200 });
         response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
         return response;
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
        console.warn(`[API ME] Client ${userRecord.email} is not associated with a practice. Returning null.`);
        // Potentially clear cookie
        const response = NextResponse.json(null, { status: 200 });
        response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
        return response;
      }
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        role: 'CLIENT',
        practiceId: userRecord.practiceId,
      };
    } else {
      console.error(`[API ME] Unknown user role for ${userRecord.email}: ${userRecord.role}. Clearing cookie and returning null.`);
      const response = NextResponse.json(null, { status: 200 });
      response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }
    
    console.log('[API ME SUCCESS] Successfully fetched user data:', userData.email, userData.role, 'Current Practice ID (if admin):', (userData as AdministratorUser).currentPracticeId);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('[API ME CATCH_ERROR] Error fetching current user:', error);
    // In case of an unexpected error, it's safer to clear the cookie and return null
    const response = NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
    response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
    return response;
  }
}
