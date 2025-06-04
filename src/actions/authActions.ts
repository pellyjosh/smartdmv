
'use server';

import { db } from '@/db';
import { users as usersTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { User, AdministratorUser } from '@/context/UserContext'; // Use User types from UserContext

export async function loginUserAction(emailInput: string, passwordInput: string): Promise<User> {
  const result = await db.select().from(usersTable).where(eq(usersTable.email, emailInput)).limit(1);
  const dbUser = result[0];

  if (!dbUser || !dbUser.password) {
    throw new Error('User not found or password not set.');
  }

  const passwordMatch = bcrypt.compareSync(passwordInput, dbUser.password);
  if (!passwordMatch) {
    throw new Error('Invalid credentials. Please try again.');
  }

  let userData: User;

  if (dbUser.role === 'ADMINISTRATOR') {
    const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
      .from(adminPracticesTable)
      .where(eq(adminPracticesTable.administratorId, dbUser.id));
    
    const accessiblePracticeIds = adminPractices.map(p => p.practiceId);
    let currentPracticeId = dbUser.currentPracticeId;

    if (!currentPracticeId && accessiblePracticeIds.length > 0) {
      currentPracticeId = accessiblePracticeIds[0];
    } else if (accessiblePracticeIds.length === 0) { 
      console.warn(`[AuthAction loginUserAction] Administrator ${dbUser.email} has no current or accessible practices configured.`);
      currentPracticeId = 'practice_NONE'; // Fallback
    } else if (currentPracticeId && !accessiblePracticeIds.includes(currentPracticeId) && accessiblePracticeIds.length > 0) {
        console.warn(`[AuthAction loginUserAction] Administrator ${dbUser.email}'s currentPracticeId ${currentPracticeId} is not in accessible list. Defaulting to first accessible.`);
        currentPracticeId = accessiblePracticeIds[0];
    }


    userData = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      role: 'ADMINISTRATOR',
      accessiblePracticeIds,
      currentPracticeId: currentPracticeId!,
    };
  } else if (dbUser.role === 'PRACTICE_ADMINISTRATOR') {
    if (!dbUser.practiceId) {
      throw new Error('Practice Administrator is not associated with a practice.');
    }
    userData = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      role: 'PRACTICE_ADMINISTRATOR',
      practiceId: dbUser.practiceId,
    };
  } else if (dbUser.role === 'CLIENT') {
    if (!dbUser.practiceId) {
      throw new Error('Client is not associated with a practice.');
    }
    userData = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      role: 'CLIENT',
      practiceId: dbUser.practiceId,
    };
  } else {
    throw new Error('Unknown user role.');
  }
  return userData;
}

export async function switchPracticeAction(userId: string, newPracticeId: string): Promise<{ success: boolean; updatedUser?: User }> {
  console.log(`[AuthAction switchPracticeAction] User ${userId} attempting to switch to practice ${newPracticeId}`);
  try {
    const userResult = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!userResult[0] || userResult[0].role !== 'ADMINISTRATOR') {
      console.error(`[AuthAction switchPracticeAction] User ${userId} not found or not an administrator.`);
      throw new Error("User not found or not an administrator.");
    }

    const adminUserPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
      .from(adminPracticesTable)
      .where(eq(adminPracticesTable.administratorId, userId));
    if (!adminUserPractices.map(p => p.practiceId).includes(newPracticeId)) {
        console.error(`[AuthAction switchPracticeAction] Administrator ${userId} does not have access to practice ${newPracticeId}.`);
        throw new Error("Administrator does not have access to this practice.");
    }

    console.log(`[AuthAction switchPracticeAction] Updating currentPracticeId for user ${userId} to ${newPracticeId} in DB.`);
    await db.update(usersTable)
      .set({ currentPracticeId: newPracticeId }) // `updatedAt` should be handled by DB/Drizzle automatically
      .where(eq(usersTable.id, userId));
    console.log(`[AuthAction switchPracticeAction] DB update successful for user ${userId}.`);
    
     const updatedDbUser = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
     if(!updatedDbUser[0]) {
        console.error(`[AuthAction switchPracticeAction] Failed to refetch user ${userId} after update.`);
        throw new Error("Failed to refetch user after update.")
     }
    console.log(`[AuthAction switchPracticeAction] Refetched user ${userId}, currentPracticeId from DB: ${updatedDbUser[0].currentPracticeId}`);

    const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
      .from(adminPracticesTable)
      .where(eq(adminPracticesTable.administratorId, updatedDbUser[0].id));
    const accessiblePracticeIds = adminPractices.map(p => p.practiceId);

    const refreshedUser: AdministratorUser = { 
        id: updatedDbUser[0].id,
        email: updatedDbUser[0].email,
        name: updatedDbUser[0].name || undefined,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds: accessiblePracticeIds,
        currentPracticeId: newPracticeId, // Explicitly use newPracticeId that was set
    }
    console.log(`[AuthAction switchPracticeAction] Successfully switched practice for user ${userId}. Refreshed user currentPracticeId: ${refreshedUser.currentPracticeId}`);
    return { success: true, updatedUser: refreshedUser };

  } catch (error) {
    console.error("[AuthAction switchPracticeAction] Failed to switch practice:", error instanceof Error ? error.message : error);
    if (error instanceof Error) {
        return { success: false, updatedUser: undefined }; 
    }
    return { success: false };
  }
}
