
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users as usersTable, sessions as sessionsTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext'; // Use User types from context

export async function GET(request: Request) {
  const sessionTokenValue = cookies().get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

  if (!sessionTokenValue) {
    // No httpOnly session token, so no user. Return null with 200 OK as it's not an "error" state.
    return NextResponse.json(null, { status: 200 }); 
  }

  try {
    const now = process.env.DB_TYPE === 'sqlite' ? Date.now() : new Date();

    const session = await db.query.sessions.findFirst({
      where: eq(sessionsTable.id, sessionTokenValue),
    });

    if (!session) {
      // Session ID from cookie not found in DB.
      return NextResponse.json(null, { status: 200 }); 
    }

    // Check if session expired (for SQLite, expiresAt is number)
    const sessionExpiresAt = typeof session.expiresAt === 'number' ? session.expiresAt : new Date(session.expiresAt).getTime();
    const currentTime = typeof now === 'number' ? now : now.getTime();

    if (sessionExpiresAt < currentTime) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionTokenValue)); // Clean up expired session
      // Session expired.
      return NextResponse.json(null, { status: 200 }); 
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(usersTable.id, session.userId),
    });

    if (!userRecord) {
      // User associated with session not found. This implies data inconsistency.
      console.error(`[API ME] User not found for session ID: ${sessionTokenValue}, userId: ${session.userId}`);
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionTokenValue)); // Clean up orphaned session
      return NextResponse.json(null, { status: 200 }); 
    }

    let userData: User;

    if (userRecord.role === 'ADMINISTRATOR') {
      const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
        .from(adminPracticesTable)
        .where(eq(adminPracticesTable.administratorId, userRecord.id));
      
      const accessiblePracticeIds = adminPractices.map(p => p.practiceId);
      let currentPracticeId = userRecord.currentPracticeId;

      if (!currentPracticeId && accessiblePracticeIds.length > 0) {
        currentPracticeId = accessiblePracticeIds[0];
      } else if (!currentPracticeId && accessiblePracticeIds.length === 0) {
        currentPracticeId = 'practice_NONE'; // Fallback, consider if this is the best default
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
         console.warn(`[API ME] Practice Administrator ${userRecord.email} is not associated with a practice.`);
         // Depending on strictness, you might return null or an error
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
        console.warn(`[API ME] Client ${userRecord.email} is not associated with a practice.`);
        // Depending on strictness, you might return null or an error
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
      console.error(`[API ME] Unknown user role for ${userRecord.email}: ${userRecord.role}`);
      return NextResponse.json(null, { status: 200 }); // Unknown role
    }

    return NextResponse.json(userData);

  } catch (error) {
    console.error('[API ME] Error fetching current user:', error);
    // For actual errors during processing, return a 500
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
  }
}
