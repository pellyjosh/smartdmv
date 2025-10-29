"use client";

import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";

interface ClientHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function ClientHeader({
  title = "Client Portal",
  subtitle,
  showBackButton = false,
  backHref = "/client",
  backLabel = "Back",
}: ClientHeaderProps) {
  const { user, logout } = useUser();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logout();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  const displaySubtitle = subtitle || `Welcome back, ${user?.name || "Client"}`;

  // User Profile Content Component
  const UserProfileContent = () => {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Personal Information</h4>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <div className="text-sm text-muted-foreground">Name:</div>
            <div className="text-sm font-medium">{user?.name}</div>

            <div className="text-sm text-muted-foreground">Email:</div>
            <div className="text-sm">{user?.email}</div>

            <div className="text-sm text-muted-foreground">Phone:</div>
            <div className="text-sm">{user?.phone || "Not provided"}</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Account Information</h4>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <div className="text-sm text-muted-foreground">Username:</div>
            <div className="text-sm">{user?.username}</div>

            <div className="text-sm text-muted-foreground">Account Type:</div>
            <div className="text-sm">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {user?.role}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              SMS Notifications:
            </div>
            <div className="text-sm">Enabled</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">{displaySubtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/client/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  setIsSigningOut(true);
                  await logout();
                } catch (e) {
                  console.error("Sign out failed", e);
                } finally {
                  setIsSigningOut(false);
                }
              }}
              className={isSigningOut ? "opacity-60 pointer-events-none" : ""}
            >
              {isSigningOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          className="flex items-center"
          onClick={async () => {
            try {
              setIsSigningOut(true);
              await logout();
            } catch (e) {
              console.error("Sign out failed", e);
            } finally {
              setIsSigningOut(false);
            }
          }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Account Profile</DialogTitle>
            <DialogDescription>
              Your personal information and account details
            </DialogDescription>
          </DialogHeader>
          <UserProfileContent />
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="sm:w-auto flex-1"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign Out
            </Button>
            <DialogClose asChild>
              <Button className="sm:w-auto flex-1">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
