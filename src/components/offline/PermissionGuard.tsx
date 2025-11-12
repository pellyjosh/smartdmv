/**
 * Permission Guard Component
 * Conditionally renders children based on permissions
 */

"use client";

import { useEffect, useState } from "react";
import { useOfflinePermissions } from "@/hooks/offline/use-offline-permissions";
import type { PermissionAction } from "@/lib/offline/types/permission.types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export interface PermissionGuardProps {
  children: React.ReactNode;
  resource: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  resource,
  action,
  fallback,
  showMessage = false,
}: PermissionGuardProps) {
  const { canCreate, canRead, canUpdate, canDelete } = useOfflinePermissions();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setIsLoading(true);
      try {
        let hasPermission = false;

        switch (action) {
          case "create":
            hasPermission = await canCreate(resource);
            break;
          case "read":
            hasPermission = await canRead(resource);
            break;
          case "update":
            hasPermission = await canUpdate(resource);
            break;
          case "delete":
            hasPermission = await canDelete(resource);
            break;
        }

        setAllowed(hasPermission);
      } catch (error) {
        console.error("[PermissionGuard] Error checking permission:", error);
        setAllowed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [resource, action, canCreate, canRead, canUpdate, canDelete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to {action} {resource}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}

/**
 * Hook-based permission guard for conditional rendering
 */
export function usePermissionGuard(resource: string, action: PermissionAction) {
  const { canCreate, canRead, canUpdate, canDelete } = useOfflinePermissions();
  const [allowed, setAllowed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setIsLoading(true);
      try {
        let hasPermission = false;

        switch (action) {
          case "create":
            hasPermission = await canCreate(resource);
            break;
          case "read":
            hasPermission = await canRead(resource);
            break;
          case "update":
            hasPermission = await canUpdate(resource);
            break;
          case "delete":
            hasPermission = await canDelete(resource);
            break;
        }

        setAllowed(hasPermission);
      } catch (error) {
        console.error("[usePermissionGuard] Error checking permission:", error);
        setAllowed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [resource, action, canCreate, canRead, canUpdate, canDelete]);

  return { allowed, isLoading };
}
