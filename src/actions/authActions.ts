
'use server';

import { db } from '@/db';
import { users as usersTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { User, AdministratorUser } from '@/context/UserContext'; // Use User types from UserContext
import { analyzeError, retryWithBackoff } from '@/lib/network-utils';

export async function loginUserAction(emailInput: string, passwordInput: string): Promise<User> {
  try {
    return await retryWithBackoff(async () => {
      const result = await (db as any).select().from(usersTable).where(eq(usersTable.email, emailInput)).limit(1);
      const dbUser = result[0];

      if (!dbUser || !dbUser.password) {
        throw new Error('User not found or password not set.');
      }

      const passwordMatch = bcrypt.compareSync(passwordInput, dbUser.password);
      if (!passwordMatch) {
        throw new Error('Invalid credentials. Please try again.');
      }

      let userData: User;

      if (dbUser.role === 'ADMINISTRATOR' || dbUser.role === 'SUPER_ADMIN') {
        const adminPractices = await (db as any).select({ practiceId: adminPracticesTable.practiceId })
          .from(adminPracticesTable)
          .where(eq(adminPracticesTable.administratorId, dbUser.id));
        
        const accessiblePracticeIds = adminPractices.map((p: { practiceId: number }) => p.practiceId.toString());
        let currentPracticeId = dbUser.currentPracticeId?.toString();

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
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: dbUser.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMINISTRATOR',
          accessiblePracticeIds,
          currentPracticeId: currentPracticeId!,
          companyId: 'default-company', // TODO: Get from actual company context
        };
      } else if (dbUser.role === 'PRACTICE_ADMINISTRATOR') {
        if (!dbUser.practiceId) {
          throw new Error('Practice Administrator is not associated with a practice.');
        }
        userData = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: 'PRACTICE_ADMINISTRATOR',
          practiceId: dbUser.practiceId.toString(),
          companyId: 'default-company', // TODO: Get from actual company context
        };
      } else if (dbUser.role === 'CLIENT') {
        if (!dbUser.practiceId) {
          throw new Error('Client is not associated with a practice.');
        }
        userData = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: 'CLIENT',
          practiceId: dbUser.practiceId.toString(),
          companyId: 'default-company', // TODO: Get from actual company context
        };
      } else {
        throw new Error('Unknown user role.');
      }
      return userData;
    }, 2, 1500); // 2 retries with 1.5 second base delay
  } catch (error) {
    const networkError = analyzeError(error);
    console.error('[AuthAction loginUserAction] Login failed:', {
      isNetworkError: networkError.isNetworkError,
      isDatabaseError: networkError.isDatabaseError,
      userMessage: networkError.userMessage,
      technicalMessage: networkError.technicalMessage
    });
    
    // Throw a user-friendly error message for network issues
    if (networkError.isNetworkError || networkError.isDatabaseError) {
      throw new Error(networkError.userMessage);
    }
    
    // Re-throw the original error for non-network issues
    throw error;
  }
}

export async function switchPracticeAction(userId: string, newPracticeId: string): Promise<User> {
  try {
    return await retryWithBackoff(async () => {
      // Convert to proper types for database query
      const userIdInt = parseInt(userId, 10);
      const newPracticeIdInt = parseInt(newPracticeId, 10);

      if (isNaN(userIdInt) || isNaN(newPracticeIdInt)) {
        throw new Error('Invalid user ID or practice ID.');
      }

      // Fetch user to verify they exist and their current state
      const userResult = await (db as any).select().from(usersTable).where(eq(usersTable.id, userIdInt)).limit(1);
      const dbUser = userResult[0];

      if (!dbUser) {
        throw new Error('User not found.');
      }

      // Update current practice for the user
      await (db as any).update(usersTable)
        .set({ currentPracticeId: newPracticeIdInt })
        .where(eq(usersTable.id, userIdInt));

      // For administrators, verify they have access to this practice
      if (dbUser.role === 'ADMINISTRATOR' || dbUser.role === 'SUPER_ADMIN') {
        const adminPractices = await (db as any).select({ practiceId: adminPracticesTable.practiceId })
          .from(adminPracticesTable)
          .where(eq(adminPracticesTable.administratorId, dbUser.id));
        
        const accessiblePracticeIds = adminPractices.map((p: { practiceId: number }) => p.practiceId.toString());

        // Return updated user data for administrators
        return {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: dbUser.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMINISTRATOR',
          accessiblePracticeIds,
          currentPracticeId: newPracticeId,
          companyId: 'default-company',
        };
      }

      // For other roles (PRACTICE_ADMINISTRATOR, CLIENT)
      return {
        id: dbUser.id.toString(),
        email: dbUser.email,
        name: dbUser.name || undefined,
        role: dbUser.role,
        practiceId: newPracticeId,
        companyId: 'default-company',
      };
    }, 2, 1000); // 2 retries with 1 second base delay
  } catch (error) {
    const networkError = analyzeError(error);
    console.error('[AuthAction switchPracticeAction] Practice switch failed:', {
      userId,
      newPracticeId,
      isNetworkError: networkError.isNetworkError,
      isDatabaseError: networkError.isDatabaseError,
      userMessage: networkError.userMessage,
      technicalMessage: networkError.technicalMessage
    });
    
    // Throw a user-friendly error message for network issues
    if (networkError.isNetworkError || networkError.isDatabaseError) {
      throw new Error(networkError.userMessage);
    }
    
    // Re-throw the original error for non-network issues
    throw error;
  }
}
