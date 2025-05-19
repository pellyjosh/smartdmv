"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Stethoscope, Heart, Sparkles, HomeIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Services', icon: Stethoscope },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/symptom-checker', label: 'Symptom Checker', icon: Sparkles },
];

export function AppSidebar() {
  const pathname = usePathname();

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
          {navItems.map((item) => (
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
    </Sidebar>
  );
}
