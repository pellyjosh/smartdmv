"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  BarChart3,
  CreditCard,
  Shield,
  Database,
  Globe,
  LogOut,
  ChevronDown,
  ChevronUp,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useOwner } from "@/context/OwnerContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Owner navigation structure
const ownerNavigation = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    href: "/owner",
    isActive: (pathname: string) => pathname === "/owner",
  },
  {
    title: "Tenants",
    icon: Building2,
    href: "/owner/tenants",
    isActive: (pathname: string) => pathname.startsWith("/owner/tenants"),
    subItems: [
      {
        title: "All Tenants",
        href: "/owner/tenants",
      },
      {
        title: "Add Tenant",
        href: "/owner/tenants/add",
      },
      {
        title: "Tenant Settings",
        href: "/owner/tenants/settings",
      },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/owner/analytics",
    isActive: (pathname: string) => pathname.startsWith("/owner/analytics"),
    subItems: [
      {
        title: "Usage Statistics",
        href: "/owner/analytics/usage",
      },
      {
        title: "Performance",
        href: "/owner/analytics/performance",
      },
      {
        title: "Reports",
        href: "/owner/analytics/reports",
      },
    ],
  },
  {
    title: "Billing",
    icon: CreditCard,
    href: "/owner/billing",
    isActive: (pathname: string) => pathname.startsWith("/owner/billing"),
    subItems: [
      {
        title: "Subscription Plans",
        href: "/owner/billing/plans",
      },
      {
        title: "Invoices",
        href: "/owner/billing/invoices",
      },
      {
        title: "Payment Methods",
        href: "/owner/billing/payments",
      },
    ],
  },
  {
    title: "System",
    icon: Database,
    href: "/owner/system",
    isActive: (pathname: string) => pathname.startsWith("/owner/system"),
    subItems: [
      {
        title: "Database Management",
        href: "/owner/system/database",
      },
      {
        title: "Backups",
        href: "/owner/system/backups",
      },
      {
        title: "Maintenance",
        href: "/owner/system/maintenance",
      },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    href: "/owner/security",
    isActive: (pathname: string) => pathname.startsWith("/owner/security"),
    subItems: [
      {
        title: "Access Logs",
        href: "/owner/security/logs",
      },
      {
        title: "Permissions",
        href: "/owner/security/permissions",
      },
      {
        title: "Audit Trail",
        href: "/owner/security/audit",
      },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/owner/settings",
    isActive: (pathname: string) => pathname.startsWith("/owner/settings"),
    subItems: [
      {
        title: "System Settings",
        href: "/owner/settings/system",
      },
      {
        title: "Email Configuration",
        href: "/owner/settings/email",
      },
      {
        title: "Domain Management",
        href: "/owner/settings/domains",
      },
    ],
  },
];

export function OwnerSidebar() {
  const { user, logout } = useOwner();
  const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<string[]>([]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/owner-auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/owner">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-sidebar-primary-foreground">
                  <Globe className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SmartDVM</span>
                  <span className="truncate text-xs">Owner Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {ownerNavigation.map((item) => {
            const isActive = item.isActive(pathname);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openSections.includes(item.title);

            if (hasSubItems) {
              return (
                <SidebarMenuItem key={item.title}>
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleSection(item.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {isOpen ? (
                          <ChevronUp className="ml-auto size-4" />
                        ) : (
                          <ChevronDown className="ml-auto size-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.href}
                            >
                              <Link href={subItem.href}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src="/placeholder.svg"
                      alt={user?.name || user?.email || "Owner"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || "O"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || "Owner"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || "owner@smartdvm.com"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <OwnerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
