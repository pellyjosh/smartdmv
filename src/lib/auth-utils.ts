import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users as usersTable, sessions as sessionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext';

export interface UserPracticeInfo {
  userId: string;
  practiceId: string;
  userRole: string;
  email: string;
  user: User;
}

// Server-side version of UserContext getUserPracticeId logic
function getUserPracticeId(user: User): string | undefined {
  if (!user) return undefined;
  if (user.role === 'CLIENT' || user.role === 'PRACTICE_ADMINISTRATOR' || user.role === 'VETERINARIAN' || user.role === 'PRACTICE_MANAGER') {
    return user.practiceId;
  }
  if (user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN') {
    return user.currentPracticeId;
  }
  return undefined;
}

export async function getUserPractice(request: NextRequest): Promise<UserPracticeInfo | null> {
  try {
    const cookieStore = await cookies();
    const sessionTokenValue = cookieStore.get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

    if (!sessionTokenValue) {
      return null;
    }

    // Get session
    const session = await db.query.sessions.findFirst({
      where: eq(sessionsTable.id, sessionTokenValue)
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    const sessionExpiresAt = typeof session.expiresAt === 'number' 
                             ? session.expiresAt 
                             : new Date(session.expiresAt).getTime();
    const currentTime = Date.now();

    if (sessionExpiresAt < currentTime) {
      return null;
    }

    // Get user
    const userRecord = await db.query.users.findFirst({
      where: eq(usersTable.id, session.userId),
    });

    if (!userRecord) {
      return null;
    }

    // Create User object matching UserContext types
    let userData: User;
    
    if (userRecord.role === 'CLIENT') {
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'CLIENT',
        practiceId: userRecord.currentPracticeId || '',
      };
    } else if (userRecord.role === 'PRACTICE_ADMINISTRATOR') {
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'PRACTICE_ADMINISTRATOR',
        practiceId: userRecord.currentPracticeId || '',
      };
    } else if (userRecord.role === 'VETERINARIAN') {
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'VETERINARIAN',
        practiceId: userRecord.currentPracticeId || '',
      };
    } else if (userRecord.role === 'PRACTICE_MANAGER') {
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'PRACTICE_MANAGER',
        practiceId: userRecord.currentPracticeId || '',
      };
    } else if (userRecord.role === 'ADMINISTRATOR') {
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds: [], // Would need to query admin practices table
        currentPracticeId: userRecord.currentPracticeId || '',
      };
    } else if (userRecord.role === 'SUPER_ADMIN') {
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'SUPER_ADMIN',
        accessiblePracticeIds: [], // Would need to query admin practices table
        currentPracticeId: userRecord.currentPracticeId || '',
      };
    } else {
      return null; // Unknown role
    }

    // Use the same logic as UserContext
    const practiceId = getUserPracticeId(userData);

    if (!practiceId) {
      return null;
    }

    return {
      userId: userRecord.id,
      practiceId: practiceId,
      userRole: userRecord.role,
      email: userRecord.email,
      user: userData,
    };
  } catch (error) {
    console.error('Error getting user practice:', error);
    return null;
  }
}

export async function getCurrentUser(request: NextRequest) {
  try {
    const sessionTokenValue = (await cookies()).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

    if (!sessionTokenValue) {
      return null;
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessionsTable.id, sessionTokenValue)
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    const sessionExpiresAt = typeof session.expiresAt === 'number' 
                             ? session.expiresAt 
                             : new Date(session.expiresAt).getTime();
    const currentTime = Date.now();

    if (sessionExpiresAt < currentTime) {
      return null;
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(usersTable.id, session.userId),
    });

    return userRecord;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
