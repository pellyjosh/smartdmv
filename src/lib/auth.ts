// src/lib/auth.ts
import { cookies } from 'next/headers';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { users as usersTable, sessions as sessionsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext';

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    const cookieStore = cookies();
    const sessionTokenValue = (await cookieStore).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

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

    if (!userRecord) return null;

    // Map DB user record to the application User shape
    return {
      id: userRecord.id.toString(),
      email: userRecord.email,
      username: userRecord.username,
      name: userRecord.name || '',
      role: userRecord.role as User['role'],
      practiceId: userRecord.practiceId?.toString(),
      currentPracticeId: userRecord.currentPracticeId?.toString(),
      phone: userRecord.phone,
      address: userRecord.address,
      city: userRecord.city,
      state: userRecord.state,
      zipCode: userRecord.zipCode,
      country: userRecord.country,
      emergencyContactName: userRecord.emergencyContactName,
      emergencyContactPhone: userRecord.emergencyContactPhone,
      emergencyContactRelationship: userRecord.emergencyContactRelationship,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt,
    } as User;
    
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
