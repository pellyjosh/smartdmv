import { NextRequest } from 'next/server';
import { SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext';

export interface AuditUserContext {
  userId: string;
  practiceId?: string;
  role?: string;
  email?: string;
  name?: string;
}

/**
 * Extract user context from request for audit logging
 */
export async function getUserContextFromRequest(request: NextRequest): Promise<AuditUserContext | null> {
  try {
    // Try to get user from session cookie first
    const sessionCookie = request.cookies.get(SESSION_TOKEN_COOKIE_NAME)?.value;
    
    if (sessionCookie) {
      const user = JSON.parse(sessionCookie) as User;
      if (user && user.id && user.role) {
        const practiceId = 'practiceId' in user ? user.practiceId : 
                          'currentPracticeId' in user ? user.currentPracticeId : undefined;
        
        return {
          userId: user.id.toString(),
          practiceId: practiceId?.toString(),
          role: user.role,
          email: user.email,
          name: user.name
        };
      }
    }

    // Try to get user from request headers (for API keys, etc.)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Handle API key or JWT token if you have that system
      // This is a placeholder - implement based on your auth system
      const token = authHeader.substring(7);
      // You would validate the token and extract user info here
    }

    // For system/automated operations, check for special headers
    const systemUserId = request.headers.get('x-system-user-id');
    if (systemUserId) {
      return {
        userId: systemUserId,
        role: 'SYSTEM'
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to extract user context from request:', error);
    return null;
  }
}

/**
 * Extract user context from a standard Request object (for API routes)
 */
export async function getUserContextFromStandardRequest(request: Request): Promise<AuditUserContext | null> {
  try {
    // Extract cookies from headers
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    // Parse cookies manually
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);

    const sessionCookie = cookies[SESSION_TOKEN_COOKIE_NAME];
    
    if (sessionCookie) {
      const user = JSON.parse(sessionCookie) as User;
      if (user && user.id && user.role) {
        const practiceId = 'practiceId' in user ? user.practiceId : 
                          'currentPracticeId' in user ? user.currentPracticeId : undefined;
        
        return {
          userId: user.id.toString(),
          practiceId: practiceId?.toString(),
          role: user.role,
          email: user.email,
          name: user.name
        };
      }
    }

    // Check for API authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Handle API key or JWT token
      const token = authHeader.substring(7);
      // Implement token validation here
    }

    // For system operations
    const systemUserId = request.headers.get('x-system-user-id');
    if (systemUserId) {
      return {
        userId: systemUserId,
        role: 'SYSTEM'
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to extract user context from standard request:', error);
    return null;
  }
}

/**
 * Get user context for server actions (when you have direct user data)
 */
export function createUserContext(
  userId: string | number,
  practiceId?: string | number,
  role?: string,
  email?: string,
  name?: string
): AuditUserContext {
  return {
    userId: userId.toString(),
    practiceId: practiceId?.toString(),
    role,
    email,
    name
  };
}
