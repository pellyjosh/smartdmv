/**
 * RBAC Middleware for Route Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  hasAdminPermissions, 
  hasSystemAccess, 
  hasPracticeAdminAccess,
  getUserRolePermissions 
} from './utils';
import { ResourceType, StandardAction } from './types';
import { UserRoleEnum } from '@/db/schema';

interface RouteConfig {
  path: string;
  requiredRole?: UserRoleEnum[];
  requiredPermissions?: Array<{
    resource: ResourceType | string;
    action: StandardAction | string;
  }>;
  isAdminRoute?: boolean;
  isPracticeRoute?: boolean;
}

// Define protected routes and their requirements
export const PROTECTED_ROUTES: RouteConfig[] = [
  // Admin routes
  {
    path: '/admin',
    isAdminRoute: true,
    requiredRole: [
      UserRoleEnum.SUPER_ADMIN,
      UserRoleEnum.PRACTICE_ADMINISTRATOR,
      UserRoleEnum.ADMINISTRATOR,
      UserRoleEnum.PRACTICE_ADMIN
    ]
  },
  {
    path: '/admin/users-and-permissions',
    requiredPermissions: [
      { resource: ResourceType.USER, action: StandardAction.READ },
      { resource: ResourceType.ROLE, action: StandardAction.READ }
    ]
  },
  {
    path: '/admin/system',
    requiredRole: [UserRoleEnum.SUPER_ADMIN]
  },
  {
    path: '/admin/practices',
    requiredRole: [
      UserRoleEnum.SUPER_ADMIN,
      UserRoleEnum.PRACTICE_ADMINISTRATOR
    ]
  },

  // Practice management routes
  {
    path: '/practice',
    isPracticeRoute: true,
    requiredRole: [
      UserRoleEnum.SUPER_ADMIN,
      UserRoleEnum.PRACTICE_ADMINISTRATOR,
      UserRoleEnum.ADMINISTRATOR,
      UserRoleEnum.PRACTICE_ADMIN,
      UserRoleEnum.PRACTICE_MANAGER,
      UserRoleEnum.OFFICE_MANAGER,
      UserRoleEnum.VETERINARIAN,
      UserRoleEnum.TECHNICIAN,
      UserRoleEnum.RECEPTIONIST,
      UserRoleEnum.CASHIER,
      UserRoleEnum.ACCOUNTANT
    ]
  },

  // Financial routes
  {
    path: '/billing',
    requiredPermissions: [
      { resource: ResourceType.BILLING, action: StandardAction.READ }
    ]
  },
  {
    path: '/reports/financial',
    requiredPermissions: [
      { resource: ResourceType.BILLING, action: StandardAction.READ },
      { resource: ResourceType.REPORT, action: StandardAction.READ }
    ]
  },

  // Medical routes
  {
    path: '/medical',
    requiredRole: [
      UserRoleEnum.SUPER_ADMIN,
      UserRoleEnum.PRACTICE_ADMINISTRATOR,
      UserRoleEnum.ADMINISTRATOR,
      UserRoleEnum.PRACTICE_ADMIN,
      UserRoleEnum.VETERINARIAN,
      UserRoleEnum.TECHNICIAN
    ]
  },
  {
    path: '/lab',
    requiredPermissions: [
      { resource: ResourceType.LAB_ORDER, action: StandardAction.READ }
    ]
  },
  {
    path: '/imaging',
    requiredPermissions: [
      { resource: ResourceType.IMAGING_ORDER, action: StandardAction.READ }
    ]
  },

  // Inventory routes
  {
    path: '/inventory',
    requiredPermissions: [
      { resource: ResourceType.INVENTORY, action: StandardAction.READ }
    ]
  },

  // Client portal (special handling)
  {
    path: '/client',
    requiredRole: [
      UserRoleEnum.CLIENT,
      UserRoleEnum.SUPER_ADMIN,
      UserRoleEnum.PRACTICE_ADMINISTRATOR,
      UserRoleEnum.ADMINISTRATOR,
      UserRoleEnum.PRACTICE_ADMIN
    ]
  }
];

/**
 * Check if a path matches any protected route
 */
function getRouteConfig(pathname: string): RouteConfig | null {
  return PROTECTED_ROUTES.find(route => 
    pathname.startsWith(route.path)
  ) || null;
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: UserRoleEnum, requiredRoles?: UserRoleEnum[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

/**
 * Check if user has required permissions (simplified check)
 */
function hasRequiredPermissions(
  userRole: UserRoleEnum,
  requiredPermissions?: Array<{
    resource: ResourceType | string;
    action: StandardAction | string;
  }>
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;

  const userPermissions = getUserRolePermissions(userRole);
  
  return requiredPermissions.every(({ resource, action }) => {
    // Super admin has all permissions
    if (userRole === UserRoleEnum.SUPER_ADMIN) return true;

    // Check if user has this specific permission
    return userPermissions.some(permission => 
      permission.resource === resource && 
      permission.action === action
    );
  });
}

/**
 * Main RBAC middleware function
 */
export async function rbacMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return null; // Continue to next middleware
  }

  // Get route configuration
  const routeConfig = getRouteConfig(pathname);
  if (!routeConfig) {
    return null; // No specific protection needed
  }

  try {
    // TODO: Replace with your authentication system
    // Example: Get user from session cookie, JWT token, etc.
    const user = await getUserFromRequest(request);
    
    if (!user) {
      // Redirect to login
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = user.role as UserRoleEnum;

    // Check role requirements
    if (!hasRequiredRole(userRole, routeConfig.requiredRole)) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }

    // Check permission requirements
    if (!hasRequiredPermissions(userRole, routeConfig.requiredPermissions)) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }

    // Additional checks for admin routes
    if (routeConfig.isAdminRoute && !hasAdminPermissions(userRole)) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }

    // Additional checks for practice routes
    if (routeConfig.isPracticeRoute) {
      // Check if user has practice access
      if (userRole === UserRoleEnum.CLIENT) {
        // Clients should not access practice management routes
        return NextResponse.redirect(new URL('/client', request.url));
      }

      // For practice-specific users, ensure they have practice access
      if ('practiceId' in user && !user.practiceId) {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }

    // All checks passed
    return null; // Continue to next middleware

  } catch (error) {
    console.error('RBAC Middleware Error:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

/**
 * Get user from request (placeholder function)
 * TODO: Implement based on your authentication system
 */
async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  // Example implementations:
  
  // Option 1: JWT Token from Authorization header
  // const authHeader = request.headers.get('authorization');
  // if (authHeader?.startsWith('Bearer ')) {
  //   const token = authHeader.substring(7);
  //   return await verifyJWT(token);
  // }
  
  // Option 2: Session cookie
  // const sessionCookie = request.cookies.get('session')?.value;
  // if (sessionCookie) {
  //   return await getSessionUser(sessionCookie);
  // }
  
  // Option 3: Next-auth (if using next-auth)
  // const token = await getToken({ req: request });
  // return token?.user || null;
  
  // For now, return null (no authentication)
  return null;
}

/**
 * Check if route is public (no authentication required)
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/auth',
    '/api/auth',
    '/public',
    '/favicon.ico',
    '/_next',
    '/assets',
    '/uploads',
    '/widget',
    '/api/public',
    '/api/webhook',
    '/api/health'
  ];

  return publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * Helper function to check API route permissions
 */
export async function checkApiPermission(
  request: NextRequest,
  requiredPermission: {
    resource: ResourceType | string;
    action: StandardAction | string;
  }
): Promise<{ allowed: boolean; user?: any; error?: string }> {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return { allowed: false, error: 'Authentication required' };
    }

    const userRole = user.role as UserRoleEnum;

    // Super admin has all permissions
    if (userRole === UserRoleEnum.SUPER_ADMIN) {
      return { allowed: true, user };
    }

    // Check specific permission
    const hasPermission = hasRequiredPermissions(userRole, [requiredPermission]);
    
    if (!hasPermission) {
      return { allowed: false, user, error: 'Insufficient permissions' };
    }

    return { allowed: true, user };

  } catch (error) {
    console.error('API Permission Check Error:', error);
    return { allowed: false, error: 'Permission check failed' };
  }
}

/**
 * API route wrapper for permission checking
 */
export function withPermission(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  requiredPermission: {
    resource: ResourceType | string;
    action: StandardAction | string;
  }
) {
  return async (req: NextRequest, context: any) => {
    const permissionCheck = await checkApiPermission(req, requiredPermission);
    
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error || 'Access denied' },
        { status: permissionCheck.error === 'Authentication required' ? 401 : 403 }
      );
    }

    // Add user to request context
    (req as any).user = permissionCheck.user;
    
    return handler(req, context);
  };
}

/**
 * Role-based API route wrapper
 */
export function withRole(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  requiredRoles: UserRoleEnum[]
) {
  return async (req: NextRequest, context: any) => {
    try {
      const user = await getUserFromRequest(req);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const userRole = user.role as UserRoleEnum;

      if (!requiredRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Insufficient role permissions' },
          { status: 403 }
        );
      }

      // Add user to request context
      (req as any).user = user;
      
      return handler(req, context);

    } catch (error) {
      console.error('Role Check Error:', error);
      return NextResponse.json(
        { error: 'Authorization failed' },
        { status: 500 }
      );
    }
  };
}
