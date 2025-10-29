// src/lib/owner-auth.ts
import { NextRequest } from 'next/server';
import { ownerDb } from '@/db/owner-db.config';
import { ownerUsers, ownerSessions } from '@/owner/db/schemas/ownerSchema';
import { eq, and, gt } from 'drizzle-orm';

export interface OwnerUser {
  id: number;
  email: string;
  username: string;
  name: string | null;
  role: string;
}

export async function getOwnerUser(request: NextRequest): Promise<OwnerUser | null> {
  try {
    const sessionId = request.cookies.get('owner_session')?.value;
    
    if (!sessionId) {
      return null;
    }

    // Get session with user data
    const [sessionWithUser] = await ownerDb
      .select({
        userId: ownerSessions.userId,
        expiresAt: ownerSessions.expiresAt,
        userEmail: ownerUsers.email,
        userName: ownerUsers.name,
        userUsername: ownerUsers.username,
        userRole: ownerUsers.role,
      })
      .from(ownerSessions)
      .innerJoin(ownerUsers, eq(ownerSessions.userId, ownerUsers.id))
      .where(
        and(
          eq(ownerSessions.id, sessionId),
          gt(ownerSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!sessionWithUser) {
      return null;
    }

    return {
      id: sessionWithUser.userId,
      email: sessionWithUser.userEmail,
      username: sessionWithUser.userUsername,
      name: sessionWithUser.userName,
      role: sessionWithUser.userRole,
    };
  } catch (error) {
    console.error('Error getting owner user:', error);
    return null;
  }
}

export async function requireOwnerAuth(request: NextRequest): Promise<OwnerUser> {
  const user = await getOwnerUser(request);
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
