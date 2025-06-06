
"use client";

import type { AdministratorUser } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
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
import { Building2, ChevronDown, LogOut, User as UserIcon, Settings, UserCog } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  // title?: string; // Title prop not currently used based on provided design
}

export function AppHeader({}: AppHeaderProps) {
  const { user, logout, switchPractice, isLoading } = useUser();

  const handleLogout = () => {
    logout();
  };

  const getInitials = (nameOrEmail: string | undefined): string => {
    if (!nameOrEmail) return "U";
    const parts = nameOrEmail.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  const adminUser = user?.role === 'ADMINISTRATOR' ? user as AdministratorUser : null;
  const isMultiLocationEnabled = adminUser && adminUser.accessiblePracticeIds && adminUser.accessiblePracticeIds.length > 1;

  const handlePracticeChange = async (newPracticeId: string) => {
    if (switchPractice && adminUser) {
      console.log('[AppHeader] Attempting to switch practice to:', newPracticeId);
      await switchPractice(newPracticeId);
    }
  };

  const currentPracticeName =
    adminUser?.currentPracticeId?.replace('practice_', '') ||
    (user?.role === 'PRACTICE_ADMINISTRATOR' && user.practiceId?.replace('practice_', '')) ||
    (user?.role === 'CLIENT' && user.practiceId?.replace('practice_', '')) ||
    'N/A';

  // Log currentPracticeId for debugging
  if (adminUser) {
    console.log('[AppHeader] Rendering. Current Practice ID from context:', adminUser.currentPracticeId);
  }


  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 h-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex h-full justify-between items-center">
          <div className="flex items-center gap-x-3">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-bold flex items-baseline">
                <span className="text-foreground">Smart</span><span className="text-primary">DVM</span>
              </h1>
            </Link>

            {isMultiLocationEnabled && adminUser && (
              <div className="ml-4 hidden sm:block">
                 <Select
                    key={`desktop-practice-select-${adminUser.currentPracticeId}`} // Key to force re-render
                    value={adminUser.currentPracticeId}
                    onValueChange={handlePracticeChange}
                    disabled={isLoading}
                  >
                  <SelectTrigger className="w-auto min-w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Select practice" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUser.accessiblePracticeIds.map(practiceId => (
                      <SelectItem key={practiceId} value={practiceId} className="text-sm">
                        {practiceId.replace('practice_', '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-x-3">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 py-2 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0">
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
                      <p className="text-sm font-medium leading-none text-foreground">{user.name || user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center pt-1">
                        <Building2 className="h-3 w-3 mr-1.5" />
                        Practice: {currentPracticeName}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {isMultiLocationEnabled && adminUser && (
                    <div className="sm:hidden px-2 py-1.5">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Switch Practice</p>
                       <Select
                          key={`mobile-practice-select-${adminUser.currentPracticeId}`} // Key to force re-render
                          value={adminUser.currentPracticeId}
                          onValueChange={handlePracticeChange}
                          disabled={isLoading}
                        >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Select practice" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminUser.accessiblePracticeIds.map(practiceId => (
                            <SelectItem key={practiceId} value={practiceId} className="text-xs">
                              {practiceId.replace('practice_', '')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DropdownMenuSeparator className="mt-2" />
                    </div>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex w-full cursor-pointer items-center text-sm">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                     <Link href="/settings" className="flex w-full cursor-pointer items-center text-sm">
                       <Settings className="mr-2 h-4 w-4" />
                       Settings
                    </Link>
                  </DropdownMenuItem>

                  {user.role === 'ADMINISTRATOR' && (
                    <DropdownMenuItem asChild>
                      <Link href="/administrator" className="flex w-full cursor-pointer items-center text-sm">
                        <UserCog className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'PRACTICE_ADMINISTRATOR' && (
                     <DropdownMenuItem asChild>
                      <Link href="/practice-administrator" className="flex w-full cursor-pointer items-center text-sm">
                        <UserCog className="mr-2 h-4 w-4" />
                        Practice Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className={cn(
                        "text-sm cursor-pointer focus:bg-destructive/10 focus:text-destructive",
                        "text-destructive hover:!text-destructive" // ensure destructive color on hover too
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
