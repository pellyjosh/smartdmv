"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Stethoscope, Heart, Sparkles, LogIn, LogOut, UserCircle } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter, // Added for logout button
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


const navItems = [
  { href: '/', label: 'Services', icon: Stethoscope, roles: ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR', null] }, // null for unauthenticated
  { href: '/favorites', label: 'Favorites', icon: Heart, roles: ['CLIENT', null] },
  { href: '/symptom-checker', label: 'Symptom Checker', icon: Sparkles, roles: ['CLIENT', null] },
];

// Role-specific dashboard links
const dashboardLinks = {
  CLIENT: { href: '/client', label: 'My Dashboard', icon: UserCircle },
  PRACTICE_ADMINISTRATOR: { href: '/practice-administrator', label: 'Practice Dashboard', icon: UserCircle },
  ADMINISTRATOR: { href: '/administrator', label: 'Admin Dashboard', icon: UserCircle },
};


export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, initialAuthChecked } = useAuth();

  // Hide sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }

  const availableNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || null)
  );
  
  const currentDashboardLink = user?.role ? dashboardLinks[user.role] : null;

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <PawPrint className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold text-primary">VetConnectPro</h1>
        </Link>
         <div className="group-data-[collapsible=icon]:hidden">
          <SidebarTrigger />
        </div>
        <Link href="/" className="hidden items-center gap-2 group-data-[collapsible=icon]:flex">
           <PawPrint className="h-8 w-8 text-primary" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {currentDashboardLink && (
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === currentDashboardLink.href}
                tooltip={{ children: currentDashboardLink.label, className:"bg-primary text-primary-foreground"}}
                className={cn(pathname === currentDashboardLink.href && "bg-sidebar-accent text-sidebar-accent-foreground")}
              >
                <Link href={currentDashboardLink.href}>
                  <currentDashboardLink.icon className="h-5 w-5" />
                  <span>{currentDashboardLink.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {availableNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, className:"bg-primary text-primary-foreground"}}
                className={cn(
                  (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
        {initialAuthChecked && user ? (
          <div className="flex flex-col items-center group-data-[collapsible=icon]:items-center w-full">
            <div className="flex items-center gap-2 mb-2 w-full px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                  {/* <AvatarImage src="https://github.com/shadcn.png" alt={user.email} /> */}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">{user.email}</span>
            </div>
            <SidebarMenuButton
              onClick={logout}
              tooltip={{ children: "Logout", className:"bg-destructive text-destructive-foreground"}}
              className="w-full justify-start hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:justify-center"
            >
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
          </div>
        ) : initialAuthChecked ? (
           <SidebarMenuButton
              asChild
              isActive={pathname === "/login"}
              tooltip={{ children: "Login", className:"bg-primary text-primary-foreground"}}
              className={cn(pathname === "/login" && "bg-sidebar-accent text-sidebar-accent-foreground", "w-full justify-start group-data-[collapsible=icon]:justify-center")}
            >
            <Link href="/login">
              <LogIn className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Login</span>
            </Link>
          </SidebarMenuButton>
        ) : null }
      </SidebarFooter>
    </Sidebar>
  );
}
