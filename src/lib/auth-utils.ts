import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from "@/db"
import { users as usersTable, sessions as sessionsTable, UserRoleEnum } from "@/db/schema"
import { eq } from "drizzle-orm"
import { hasAnyRole } from "./rbac/dynamic-roles"
import { getUserRolePermissions } from "./rbac/utils"
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
async function getUserPracticeId(user: User): Promise<string | undefined> {
  if (!user) return undefined;
  
  // Check if user has practice-specific roles
  const hasPracticeRole = await hasAnyRole(user.role, ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'VETERINARIAN', 'PRACTICE_MANAGER']);
  if (hasPracticeRole) {
    return user.practiceId;
  }
  
  // Check if user has system admin roles
  const hasAdminRole = await hasAnyRole(user.role, ['ADMINISTRATOR', 'SUPER_ADMIN']);
  if (hasAdminRole) {
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
      const permissions = getUserRolePermissions(UserRoleEnum.CLIENT);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'CLIENT',
        practiceId: userRecord.currentPracticeId || '',
        // Populate a minimal roles array for compatibility with new RBAC
        // helpers that expect `user.roles`.
        // Permissions will be resolved elsewhere if dynamic role data exists.
        roles: [
          { 
            id: `legacy-CLIENT`, 
            name: 'CLIENT', 
            displayName: 'Client', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'PRACTICE_ADMINISTRATOR') {
      const permissions = getUserRolePermissions(UserRoleEnum.PRACTICE_ADMINISTRATOR);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'PRACTICE_ADMINISTRATOR',
        practiceId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-PRACTICE_ADMINISTRATOR`, 
            name: 'PRACTICE_ADMINISTRATOR', 
            displayName: 'Practice Administrator', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'VETERINARIAN') {
      const permissions = getUserRolePermissions(UserRoleEnum.VETERINARIAN);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'VETERINARIAN',
        practiceId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-VETERINARIAN`, 
            name: 'VETERINARIAN', 
            displayName: 'Veterinarian', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'PRACTICE_MANAGER') {
      const permissions = getUserRolePermissions(UserRoleEnum.PRACTICE_MANAGER);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'PRACTICE_MANAGER',
        practiceId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-PRACTICE_MANAGER`, 
            name: 'PRACTICE_MANAGER', 
            displayName: 'Practice Manager', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'ADMINISTRATOR') {
      const permissions = getUserRolePermissions(UserRoleEnum.ADMINISTRATOR);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds: [], // Would need to query admin practices table
        currentPracticeId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-ADMINISTRATOR`, 
            name: 'ADMINISTRATOR', 
            displayName: 'Administrator', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'SUPER_ADMIN') {
      const permissions = getUserRolePermissions(UserRoleEnum.SUPER_ADMIN);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'SUPER_ADMIN',
        accessiblePracticeIds: [], // Would need to query admin practices table
        currentPracticeId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-SUPER_ADMIN`, 
            name: 'SUPER_ADMIN', 
            displayName: 'Super Admin', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else {
      return null; // Unknown role
    }

    // Use the same logic as UserContext
    const practiceId = await getUserPracticeId(userData);

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

    if (!userRecord) return null;

    // Map DB user record to the application User shape and include a legacy
    // `roles` array so server-side RBAC helpers (isAdmin, hasRole, etc.) work
    // without requiring per-call mapping elsewhere.
    const mapRoleToPermissions = (roleStr: string) => {
      switch (roleStr) {
        case 'CLIENT':
          return getUserRolePermissions(UserRoleEnum.CLIENT);
        case 'PRACTICE_ADMINISTRATOR':
          return getUserRolePermissions(UserRoleEnum.PRACTICE_ADMINISTRATOR);
        case 'VETERINARIAN':
          return getUserRolePermissions(UserRoleEnum.VETERINARIAN);
        case 'PRACTICE_MANAGER':
          return getUserRolePermissions(UserRoleEnum.PRACTICE_MANAGER);
        case 'ADMINISTRATOR':
          return getUserRolePermissions(UserRoleEnum.ADMINISTRATOR);
        case 'SUPER_ADMIN':
          return getUserRolePermissions(UserRoleEnum.SUPER_ADMIN);
        default:
          return [];
      }
    };

    const permissions = mapRoleToPermissions(userRecord.role as string);

    const userData: any = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      // Preserve practice ids if present on the DB record
      practiceId: (userRecord as any).practiceId || (userRecord as any).currentPracticeId || undefined,
      currentPracticeId: (userRecord as any).currentPracticeId || undefined,
      accessiblePracticeIds: (userRecord as any).accessiblePracticeIds || undefined,
      // Provide a legacy single-role mapping for compatibility with RBAC helpers
      roles: [
        {
          id: `legacy-${userRecord.role}`,
          name: userRecord.role,
          displayName: userRecord.role,
          permissions: permissions.map(p => ({ resource: p.resource, action: p.action, granted: p.granted }))
        }
      ]
    };

    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
