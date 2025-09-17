/**
 * React Components for Permission-Based Rendering
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { usePermission, useRole, useFeatureFlags } from './hooks';
import { useUser } from '@/context/UserContext';
import { ResourceType, StandardAction, WithPermissionProps, RequirePermissionProps } from './types';

/**
 * Component that conditionally renders children based on permissions
 */
export function WithPermission({
  children,
  resource,
  action,
  fallback = null,
  practiceId,
  resourceId,
  additionalContext
}: WithPermissionProps & { additionalContext?: Record<string, any> }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { checkPermission, isLoading } = usePermission(resource, action, {
    practiceId,
    resourceId,
    additionalContext
  });

  useEffect(() => {
    if (!isLoading) {
      checkPermission().then(result => {
        setHasPermission(result.allowed);
      });
    }
  }, [checkPermission, isLoading]);

  if (isLoading || hasPermission === null) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component that protects routes with permission requirements
 */
export function RequirePermission({
  children,
  resource,
  action,
  practiceId,
  resourceId,
  redirectTo = '/access-denied',
  autoRedirect = false,
  showFallback = true,
  fallbackComponent: FallbackComponent
}: RequirePermissionProps & { children: React.ReactNode }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { checkPermission, isLoading } = usePermission(resource, action, {
    practiceId,
    resourceId
  });
  // Respect the global auth readiness so we don't redirect/render access denied
  // before the initial auth check completes.
  const { initialAuthChecked, isLoading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the global auth check has completed as well as permission hook
    if (!userLoading && initialAuthChecked && !isLoading) {
      checkPermission().then(result => {
        setHasPermission(result.allowed);
        // Only perform an automatic redirect if explicitly requested. By
        // default we render an Access Denied fallback to avoid flashing a
        // redirect while the permission check settles.
        if (!result.allowed && redirectTo && autoRedirect) {
          router.push(redirectTo);
        }
      });
    }
  }, [checkPermission, isLoading, redirectTo, router, initialAuthChecked, userLoading]);

  // While global auth or permission check is pending show a compact skeleton so
  // page chrome isn't replaced by the large spinner and we avoid flashing
  // access-denied before the auth check completes.
  if (userLoading || isLoading || hasPermission === null || !initialAuthChecked) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-pulse bg-gray-200 h-4 w-28 rounded"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    
    if (showFallback) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this resource.</p>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

/**
 * Component for role-based rendering
 */
interface WithRoleProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles, if false, ANY role
}

export function WithRole({ 
  children, 
  roles, 
  fallback = null, 
  requireAll = false 
}: WithRoleProps) {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>;
  }

  if (!role) {
    return <>{fallback}</>;
  }

  const hasAccess = requireAll 
    ? roles.every(requiredRole => role === requiredRole)
    : roles.includes(role);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component for feature flag-based rendering
 */
interface WithFeatureProps {
  children: React.ReactNode;
  feature: keyof ReturnType<typeof useFeatureFlags>;
  fallback?: React.ReactNode;
}

export function WithFeature({ children, feature, fallback = null }: WithFeatureProps) {
  const features = useFeatureFlags();
  const { isLoading } = useRole();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>;
  }

  const hasFeature = features[feature];

  return hasFeature ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component for admin-only content
 */
interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  level?: 'any' | 'practice' | 'system'; // any admin, practice admin+, system admin only
}

export function AdminOnly({ children, fallback = null, level = 'any' }: AdminOnlyProps) {
  const { isAdmin, isPracticeAdmin, isSystemAdmin, isLoading } = useRole();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>;
  }

  let hasAccess = false;
  
  switch (level) {
    case 'system':
      hasAccess = isSystemAdmin;
      break;
    case 'practice':
      hasAccess = isPracticeAdmin;
      break;
    case 'any':
    default:
      hasAccess = isAdmin;
      break;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Permission-aware button component
 */
interface PermissionButtonProps extends React.ComponentProps<typeof Button> {
  resource: ResourceType | string;
  action: StandardAction | string;
  practiceId?: number;
  resourceId?: string;
  fallbackText?: string;
  children: React.ReactNode;
  isLoading?: boolean; // Allow external loading state
  loadingText?: string; // Custom loading text
}

export function PermissionButton({
  resource,
  action,
  practiceId,
  resourceId,
  fallbackText = '',
  children,
  disabled,
  isLoading: externalLoading = false,
  loadingText = 'Loading...',
  onClick,
  ...props
}: PermissionButtonProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const { checkPermission, isLoading: permissionLoading } = usePermission(resource, action, {
    practiceId,
    resourceId
  });

  const isLoading = externalLoading || internalLoading;
  const isDisabled = disabled || isLoading || !hasPermission;

  useEffect(() => {
    if (!permissionLoading) {
      checkPermission().then(result => {
        setHasPermission(result.allowed);
      });
    }
  }, [checkPermission, permissionLoading]);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick || isDisabled) return;

    setInternalLoading(true);
    try {
      await onClick(event);
    } catch (error) {
      console.error('Button action failed:', error);
    } finally {
      setInternalLoading(false);
    }
  };

  if (permissionLoading || hasPermission === null) {
    return (
      <Button 
        disabled 
        className="opacity-50 cursor-not-allowed"
        {...props}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
      </Button>
    );
  }

  if (!hasPermission) {
    return (
      <Button 
        disabled 
        title="You don't have permission to perform this action"
        className="opacity-50 cursor-not-allowed"
        {...props}
      >
        {fallbackText}
      </Button>
    );
  }

  return (
    <Button 
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {isLoading ? loadingText : children}
    </Button>
  );
}

/**
 * Permission-aware link component
 */
interface PermissionLinkProps {
  resource: ResourceType | string;
  action: StandardAction | string;
  href: string;
  practiceId?: number;
  resourceId?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PermissionLink({
  resource,
  action,
  href,
  practiceId,
  resourceId,
  fallback = null,
  children,
  className = '',
  ...props
}: PermissionLinkProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { checkPermission, isLoading } = usePermission(resource, action, {
    practiceId,
    resourceId
  });

  useEffect(() => {
    if (!isLoading) {
      checkPermission().then(result => {
        setHasPermission(result.allowed);
      });
    }
  }, [checkPermission, isLoading]);

  if (isLoading || hasPermission === null) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return (
    <a 
      href={href} 
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * Debug component to show current user permissions
 */
export function PermissionDebugger() {
  const { user, role, isAdmin, isPracticeAdmin, isSystemAdmin } = useRole();
  const features = useFeatureFlags();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg max-w-sm text-xs z-50">
      <h4 className="font-bold mb-2">Permission Debug</h4>
      <div className="space-y-1">
        <div>Role: {role || 'None'}</div>
        <div>Admin: {isAdmin ? 'Yes' : 'No'}</div>
        <div>Practice Admin: {isPracticeAdmin ? 'Yes' : 'No'}</div>
        <div>System Admin: {isSystemAdmin ? 'Yes' : 'No'}</div>
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="font-semibold">Features:</div>
          {Object.entries(features).map(([key, value]) => (
            <div key={key} className="text-xs">
              {key}: {value ? '✓' : '✗'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
