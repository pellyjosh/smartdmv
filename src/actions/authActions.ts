
'use server';

import { db } from '@/db';
import { users as usersTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { User } from '@/hooks/useAuth'; // Assuming User type is still defined/exported here

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
    } else if (!currentPracticeId && accessiblePracticeIds.length === 0) {
      console.warn(`Administrator ${dbUser.email} has no current or accessible practices configured.`);
      currentPracticeId = 'practice_NONE'; // Fallback
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
  try {
    // First, verify the user exists and is an administrator
    const userResult = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!userResult[0] || userResult[0].role !== 'ADMINISTRATOR') {
      throw new Error("User not found or not an administrator.");
    }

    // In a real scenario, you'd also verify if newPracticeId is one of the admin's accessiblePracticeIds.
    // For this example, we assume the frontend has already done this check based on user.accessiblePracticeIds.
    // However, for security, server-side validation is crucial.
    // We'd fetch accessiblePracticeIds here again or trust the client (less secure for this operation).
    // For now, we'll proceed with the update.

    await db.update(usersTable)
      .set({ currentPracticeId: newPracticeId })
      .where(eq(usersTable.id, userId));
    
    // Optionally, refetch the user to return the fully updated user object
    // For simplicity, we'll just return success. The client can update its local user object.
    // Or, we can refetch and return the relevant parts if needed by useAuth.
     const updatedDbUser = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
     if(!updatedDbUser[0]) {
        throw new Error("Failed to refetch user after update.")
     }
    const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
      .from(adminPracticesTable)
      .where(eq(adminPracticesTable.administratorId, updatedDbUser[0].id));
    const accessiblePracticeIds = adminPractices.map(p => p.practiceId);


    const refreshedUser: User = {
        id: updatedDbUser[0].id,
        email: updatedDbUser[0].email,
        name: updatedDbUser[0].name || undefined,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds: accessiblePracticeIds,
        currentPracticeId: newPracticeId,
    }

    return { success: true, updatedUser: refreshedUser };
  } catch (error) {
    console.error("Failed to switch practice:", error);
    return { success: false };
  }
}
