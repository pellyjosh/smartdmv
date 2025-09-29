
'use server';

import { db } from '@/db';
import { getCurrentTenantDb, isCurrentRequestTenant } from '@/lib/tenant-db-resolver';
import { users as usersTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { User, AdministratorUser } from '@/context/UserContext'; // Use User types from UserContext
import { analyzeError, retryWithBackoff } from '@/lib/network-utils';
import { createAuditLog, SYSTEM_USER_ID } from '@/lib/audit-logger';
import { isSuperAdmin, isPracticeAdmin, isAdmin, ROLE_NAMES } from '@/lib/rbac/dynamic-roles';
import { createUserContext } from '@/lib/auth-context';

/**
 * Get the appropriate database instance based on current request context
 * STRICT TENANT ISOLATION - NO FALLBACKS ALLOWED
 */
async function getContextualDb() {
  const isTenant = await isCurrentRequestTenant();
  
  if (!isTenant) {
    throw new Error('Tenant context required - no fallback database allowed');
  }
  
  console.log('[AUTH_DB] Using tenant-specific database');
  return await getCurrentTenantDb();
}

export async function loginUserAction(emailInput: string, passwordInput: string): Promise<User> {
  try {
    return await retryWithBackoff(async () => {
      // Get the appropriate database for the current tenant
      const contextualDb = await getContextualDb();
      
      const result = await contextualDb.select().from(usersTable).where(eq(usersTable.email, emailInput)).limit(1);
      const dbUser = result[0];

      if (!dbUser || !dbUser.password) {
        throw new Error('User not found or password not set.');
      }

      const passwordMatch = bcrypt.compareSync(passwordInput, dbUser.password);
      if (!passwordMatch) {
        throw new Error('Invalid credentials. Please try again.');
      }

      let userData: User;

      // Check if user is admin (super admin or administrator)
      const isAdminUser = await isAdmin(dbUser.role);
      const isSuperAdminUser = await isSuperAdmin(dbUser.role);
      const isPracticeAdminUser = await isPracticeAdmin(dbUser.role);

      console.log(`[AuthAction loginUserAction] Role checks for ${dbUser.email}:`);
      console.log(`[AuthAction loginUserAction] - dbUser.role: ${dbUser.role}`);
      console.log(`[AuthAction loginUserAction] - isAdminUser: ${isAdminUser}`);
      console.log(`[AuthAction loginUserAction] - isSuperAdminUser: ${isSuperAdminUser}`);
      console.log(`[AuthAction loginUserAction] - isPracticeAdminUser: ${isPracticeAdminUser}`);
      console.log(`[AuthAction loginUserAction] - Condition (isAdminUser && !isPracticeAdminUser): ${isAdminUser && !isPracticeAdminUser}`);

      if (isAdminUser && !isPracticeAdminUser) {
        const adminPractices = await contextualDb.select({ practiceId: adminPracticesTable.practiceId })
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
          role: isSuperAdminUser ? ROLE_NAMES.SUPER_ADMIN : ROLE_NAMES.ADMINISTRATOR,
          accessiblePracticeIds,
          currentPracticeId: currentPracticeId!,
        };
      } else if (isPracticeAdminUser) {
        if (!dbUser.practiceId) {
          throw new Error('Practice Administrator is not associated with a practice.');
        }
        userData = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: 'PRACTICE_ADMINISTRATOR',
          practiceId: dbUser.practiceId.toString(),
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
        };
      } else if (['VETERINARIAN', 'TECHNICIAN', 'RECEPTIONIST', 'PRACTICE_MANAGER', 'ACCOUNTANT', 'CASHIER', 'OFFICE_MANAGER'].includes(dbUser.role)) {
        // Handle practice-based staff roles
        if (!dbUser.practiceId) {
          throw new Error(`${dbUser.role} is not associated with a practice.`);
        }
        userData = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: dbUser.role as any, // Cast to the specific role type
          practiceId: dbUser.practiceId.toString(),
        };
      } else if (dbUser.role === 'SUPER_ADMIN') {
        // Handle SUPER_ADMIN role - they can access all practices
        const adminPractices = await contextualDb.select({ practiceId: adminPracticesTable.practiceId })
          .from(adminPracticesTable)
          .where(eq(adminPracticesTable.administratorId, dbUser.id));
        
        const accessiblePracticeIds = adminPractices.map((p: { practiceId: number }) => p.practiceId.toString());
        let currentPracticeId = dbUser.currentPracticeId?.toString();

        if (!currentPracticeId && accessiblePracticeIds.length > 0) {
          currentPracticeId = accessiblePracticeIds[0];
        } else if (accessiblePracticeIds.length === 0) { 
          console.warn(`[AuthAction loginUserAction] SUPER_ADMIN ${dbUser.email} has no current or accessible practices configured.`);
          currentPracticeId = 'practice_NONE'; // Fallback
        }

        userData = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: ROLE_NAMES.SUPER_ADMIN,
          accessiblePracticeIds,
          currentPracticeId: currentPracticeId!,
        };
      } else {
        throw new Error(`Unknown user role: ${dbUser.role}.`);
      }

      // Log successful login audit
  await createAuditLog({
        action: 'ASSIGN',
        recordType: 'USER',
        recordId: userData.id,
        description: `Successful login for user ${userData.email}`,
        userId: userData.id,
        practiceId: 'practiceId' in userData ? userData.practiceId : 
                   'currentPracticeId' in userData ? userData.currentPracticeId : undefined,
        metadata: {
          userRole: userData.role,
          loginMethod: 'password',
          loginTimestamp: new Date().toISOString()
        }
      });

      return userData;
    }, 2, 1500); // 2 retries with 1.5 second base delay
  } catch (error) {
    // Log failed login attempt
    try {
      await createAuditLog({
        action: 'ASSIGN',
        recordType: 'USER',
        recordId: 'unknown',
        description: `Failed login attempt for email ${emailInput}`,
        userId: SYSTEM_USER_ID,
        metadata: {
          email: emailInput,
          failureReason: (error as Error).message,
          attemptTimestamp: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.error('Failed to log audit event for failed login:', auditError);
    }

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
      // Get the appropriate database for the current tenant
      const contextualDb = await getContextualDb();
      
      // Convert to proper types for database query
      const userIdInt = parseInt(userId, 10);
      const newPracticeIdInt = parseInt(newPracticeId, 10);

      if (isNaN(userIdInt) || isNaN(newPracticeIdInt)) {
        throw new Error('Invalid user ID or practice ID.');
      }

      // Fetch user to verify they exist and their current state
      const userResult = await contextualDb.select().from(usersTable).where(eq(usersTable.id, userIdInt)).limit(1);
      const dbUser = userResult[0];

      if (!dbUser) {
        throw new Error('User not found.');
      }

      // Update current practice for the user
      await contextualDb.update(usersTable)
        .set({ currentPracticeId: newPracticeIdInt })
        .where(eq(usersTable.id, userIdInt));

      // For administrators, verify they have access to this practice
      const isAdminUser2 = await isAdmin(dbUser.role);
      const isSuperAdminUser2 = await isSuperAdmin(dbUser.role);
      
      if (isAdminUser2) {
        const adminPractices = await contextualDb.select({ practiceId: adminPracticesTable.practiceId })
          .from(adminPracticesTable)
          .where(eq(adminPracticesTable.administratorId, dbUser.id));
        
        const accessiblePracticeIds = adminPractices.map((p: { practiceId: number }) => p.practiceId.toString());

        // Return updated user data for administrators
        return {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: isSuperAdminUser2 ? ROLE_NAMES.SUPER_ADMIN : ROLE_NAMES.ADMINISTRATOR,
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
