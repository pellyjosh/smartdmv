"use client";

import { useOwner } from "@/context/OwnerContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User as UserIcon,
  Settings,
  Building2,
  ChevronDown,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface OwnerUser {
  id: string;
  email: string;
  name?: string;
  role: "OWNER" | "COMPANY_ADMIN";
  stats?: {
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
  };
}

interface AppHeaderProps {
  // No props needed - matches admin header pattern
}

export function AppHeader({}: AppHeaderProps) {
  const { user, logout } = useOwner();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (nameOrEmail: string | undefined): string => {
    if (!nameOrEmail) return "O";
    const parts = nameOrEmail.split(" ");
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  if (!user) return null;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 h-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex h-full justify-between items-center">
          <div className="flex items-center gap-x-3">
            <Link href="/owner" className="flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-bold flex items-baseline">
                <span className="text-foreground">Smart</span>
                <span className="text-primary">DVM</span>
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-x-3">
            {/* Role indicator */}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.role === "OWNER" ? "System Owner" : "Company Admin"}
              </span>
            </div>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-10 px-2 py-2 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline font-medium text-sm text-foreground">
                      {user.name || user.email}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {user.name || "Owner"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center pt-1">
                        <Shield className="h-3 w-3 mr-1.5" />
                        Role:{" "}
                        {user.role === "OWNER"
                          ? "System Owner"
                          : "Company Admin"}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/owner/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/owner/profile" className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className={cn(
                      "text-sm cursor-pointer focus:bg-destructive/10 focus:text-destructive",
                      "text-destructive hover:!text-destructive"
                    )}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
