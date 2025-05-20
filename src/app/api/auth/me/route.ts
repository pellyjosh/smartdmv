
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
  console.log('[API ME] Found httpOnly session token:', sessionTokenValue ? '******' : 'undefined');

  try {
    const nowForDbQuery = process.env.DB_TYPE === 'sqlite' ? Date.now() : new Date();
    
    const session = await db.query.sessions.findFirst({
      where: eq(sessionsTable.id, sessionTokenValue)
      //Removed direct time comparison from here to simplify and ensure it's always checked after fetching.
    });

    if (!session) {
      console.log(`[API ME] Session ID from cookie not found in DB: ${sessionTokenValue}`);
      // Clear the invalid cookie by setting its expiration to the past
      const response = NextResponse.json(null, { status: 200 });
      response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }
    console.log('[API ME] Session found in DB for token:', session.id);

    // Check if session expired (for SQLite, expiresAt is number in ms)
    const sessionExpiresAt = typeof session.expiresAt === 'number' ? session.expiresAt : new Date(session.expiresAt).getTime();
    const currentTime = Date.now(); // Always use current time in ms for comparison

    if (sessionExpiresAt < currentTime) {
      console.log(`[API ME] Session expired. ExpiresAt: ${sessionExpiresAt}, CurrentTime: ${currentTime}. Deleting session.`);
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
      console.error(`[API ME] User not found for session ID: ${sessionTokenValue}, userId: ${session.userId}. Deleting orphaned session.`);
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

      if (!currentPracticeId && accessiblePracticeIds.length > 0) {
        currentPracticeId = accessiblePracticeIds[0];
      } else if (accessiblePracticeIds.length === 0) { // Check if admin has ANY accessible practices
         console.warn(`[API ME] Administrator ${userRecord.email} has no accessible practices configured. Setting currentPracticeId to a placeholder.`);
         currentPracticeId = 'practice_NONE'; // Fallback if no practices are accessible
      } else if (currentPracticeId && !accessiblePracticeIds.includes(currentPracticeId)) {
        console.warn(`[API ME] Administrator ${userRecord.email}'s currentPracticeId (${currentPracticeId}) is not in accessible list. Defaulting to first accessible.`);
        currentPracticeId = accessiblePracticeIds[0]; // Default to first if current is invalid
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
         console.warn(`[API ME] Practice Administrator ${userRecord.email} is not associated with a practice. Returning null.`);
         return NextResponse.json(null, { status: 200 }); 
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
        return NextResponse.json(null, { status: 200 });
      }
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        role: 'CLIENT',
        practiceId: userRecord.practiceId,
      };
    } else {
      console.error(`[API ME] Unknown user role for ${userRecord.email}: ${userRecord.role}. Returning null.`);
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('[API ME SUCCESS] Successfully fetched user data:', userData.email, userData.role);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('[API ME CATCH_ERROR] Error fetching current user:', error);
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
  }
}
