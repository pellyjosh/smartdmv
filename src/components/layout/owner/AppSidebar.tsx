"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOwner } from "@/context/OwnerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShieldAlert,
  Gauge,
  ShieldCheck,
  AppWindow,
  CreditCard,
  Boxes,
  ShoppingCart,
  Mail,
  AtSign,
  Settings2,
  Receipt,
  LineChart,
  Search,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  PanelLeft,
  LayoutDashboard,
} from "lucide-react";

// --- Type Definitions ---
type OwnerRole = "OWNER" | "SYSTEM_ADMIN";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: OwnerRole[];
  keywords?: string[];
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  roles: OwnerRole[];
  href?: string;
  items?: MenuItem[];
  keywords?: string[];
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  keywords?: string[];
  roles: OwnerRole[];
  submenu?: SubmenuItem[];
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  keywords?: string[];
  roles?: OwnerRole[];
}

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// --- Menu data ---
const menuGroups: MenuGroup[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/owner",
    icon: LayoutDashboard,
    keywords: ["home", "main", "overview", "owner dashboard"],
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-super-admin",
    title: "Super Admin",
    href: "/owner/super-admin",
    icon: ShieldAlert,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-system-governance",
    title: "System Governance",
    href: "/owner/system-governance",
    icon: Gauge,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-governance-audit",
    title: "Governance Audit",
    href: "/owner/governance-audit",
    icon: ShieldCheck,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-onboarding",
    title: "Onboarding",
    href: "/owner/tenant-management",
    icon: AppWindow,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-subscription-management",
    title: "Subscription Management",
    href: "/owner/subscription-management",
    icon: CreditCard,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-tenant-deployments",
    title: "Tenant Deployments",
    href: "/owner/tenant-deployments",
    icon: Boxes,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-marketplace",
    title: "Marketplace Management",
    href: "/owner/marketplace",
    icon: ShoppingCart,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-email-templates",
    title: "Email Templates",
    href: "/owner/email-templates",
    icon: Mail,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-email-service",
    title: "Email Service",
    href: "/owner/email-service",
    icon: AtSign,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-onboarding-settings",
    title: "Onboarding Settings",
    href: "/owner/onboarding-settings",
    icon: Settings2,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-billing-management",
    title: "Billing Management",
    href: "/owner/billing-management",
    icon: Receipt,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
  {
    id: "owner-billing-analytics",
    title: "Billing Analytics",
    href: "/owner/billing-analytics",
    icon: LineChart,
    roles: ["OWNER", "SYSTEM_ADMIN"],
  },
];

export function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    logout,
    isLoading: userIsLoading,
    initialAuthChecked,
  } = useOwner();

  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<
    Record<string, boolean>
  >({});
  const [searchTerm, setSearchTerm] = React.useState("");

  // Transform the menuGroups into the NavItem structure
  const allNavItems: NavItem[] = React.useMemo(() => {
    return menuGroups.map((group) => ({
      title: group.title,
      icon: group.icon,
      href: group.href,
      keywords: group.keywords,
      roles: group.roles,
      submenu: group.items?.map((item) => ({
        title: item.title,
        href: item.href,
        icon: item.icon,
        keywords: item.keywords,
        roles: item.roles,
      })),
    }));
  }, []);

  const filteredNavItems: NavItem[] = React.useMemo(() => {
    if (!user && !userIsLoading && initialAuthChecked) {
      return [];
    }
    if (!user) return [];

    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    const userRole = user.role;

    const userHasAnyRole = (allowedRoles: OwnerRole[] | undefined) => {
      if (!allowedRoles || allowedRoles.length === 0) return true;
      // Map owner role to system admin for permissions
      const effectiveRole = userRole === "OWNER" ? "SYSTEM_ADMIN" : userRole;
      return allowedRoles.includes(effectiveRole as OwnerRole);
    };

    if (!lowerSearchTerm) {
      // If no search term, return all role-appropriate items with their full submenus
      return allNavItems.filter((item) => userHasAnyRole(item.roles));
    }

    const results: NavItem[] = [];

    allNavItems.forEach((item) => {
      // Check if user has role for this top-level item
      const hasRoleForParent = userHasAnyRole(item.roles);
      if (!hasRoleForParent) return;

      // Check if the top-level item itself matches the search term
      const parentMatches =
        item.title.toLowerCase().includes(lowerSearchTerm) ||
        (item.keywords &&
          item.keywords.some((k) => k.toLowerCase().includes(lowerSearchTerm)));

      if (item.submenu) {
        // Filter submenu items based on roles and search term
        const filteredSubmenu = item.submenu.filter((subItem) => {
          const hasRoleForSubmenu = userHasAnyRole(subItem.roles);
          const submenuMatches =
            subItem.title.toLowerCase().includes(lowerSearchTerm) ||
            (subItem.keywords &&
              subItem.keywords.some((k) =>
                k.toLowerCase().includes(lowerSearchTerm)
              ));
          return hasRoleForSubmenu && submenuMatches;
        });

        if (parentMatches || filteredSubmenu.length > 0) {
          results.push({
            ...item,
            submenu: parentMatches ? item.submenu : filteredSubmenu,
          });
        }
      } else if (parentMatches) {
        results.push(item);
      }
    });

    return results;
  }, [user, userIsLoading, initialAuthChecked, allNavItems, searchTerm]);

  React.useEffect(() => {
    const newExpandedState: Record<string, boolean> = {};
    filteredNavItems.forEach((item) => {
      if (item.submenu && item.submenu.length > 0) {
        const hasActiveChild = item.submenu.some((child) => {
          return pathname === child.href;
        });
        if (hasActiveChild) {
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus((prev) => {
      const newState = { ...prev };
      Object.keys(newExpandedState).forEach((key) => {
        newState[key] = newExpandedState[key];
      });
      return newState;
    });
  }, [pathname, filteredNavItems]);

  const toggleMenu = React.useCallback((title: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  const getInitials = (emailOrName: string | undefined): string => {
    if (!emailOrName) return "O";
    const name = user?.name;
    const target = name || emailOrName;

    const parts = target.split(" ");
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return target.substring(0, 2).toUpperCase();
  };

  const renderNavItemContent = (
    item: NavItem | SubmenuItem,
    isSubmenuItem: boolean,
    currentViewCollapsed: boolean
  ) => {
    const itemIcon = item.icon ? (
      <item.icon
        className={cn(
          "h-5 w-5",
          currentViewCollapsed && !isSubmenuItem
            ? "mr-3 shrink-0"
            : "mr-3 shrink-0",
          isSubmenuItem && "h-4 w-4 mr-2"
        )}
      />
    ) : null;

    if (currentViewCollapsed && !isSubmenuItem) {
      return itemIcon;
    }

    return (
      <div className="flex items-center w-full justify-start text-left">
        {itemIcon}
        <span className="truncate flex-1">{item.title}</span>
      </div>
    );
  };

  const renderNavItems = React.useCallback(
    ({ currentViewCollapsed }: { currentViewCollapsed: boolean }) => {
      return filteredNavItems.map((item) => {
        const isActive = pathname === item.href;
        const isExpanded = expandedMenus[item.title];

        const commonButtonClasses = cn(
          "flex items-center w-full text-sm font-medium rounded-md transition-colors duration-150",
          "group",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
          currentViewCollapsed ? "px-2 py-3" : "px-3 py-2.5"
        );

        if (item.submenu) {
          return (
            <div key={item.title} className="space-y-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        commonButtonClasses,
                        currentViewCollapsed
                          ? "justify-start text-left"
                          : "justify-between"
                      )}
                      onClick={() => {
                        if (item.href) {
                          router.push(item.href);
                        } else {
                          toggleMenu(item.title);
                        }
                      }}
                    >
                      <div className="flex items-center w-full justify-start text-left">
                        {renderNavItemContent(
                          item,
                          false,
                          currentViewCollapsed
                        )}
                      </div>
                      {!currentViewCollapsed && item.submenu && (
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  {currentViewCollapsed && (
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              {!currentViewCollapsed && isExpanded && item.submenu && (
                <div className="ml-4 space-y-1 border-l border-gray-200 pl-4">
                  {item.submenu.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Button
                        key={subItem.title}
                        variant="ghost"
                        className={cn(
                          "flex items-center w-full text-sm rounded-md transition-colors duration-150 group px-3 py-2 justify-start text-left",
                          isSubActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => router.push(subItem.href)}
                      >
                        {renderNavItemContent(subItem, true, false)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Single nav item
        return (
          <TooltipProvider key={item.title}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(commonButtonClasses, "justify-start text-left")}
                  onClick={() => item.href && router.push(item.href)}
                >
                  {renderNavItemContent(item, false, currentViewCollapsed)}
                </Button>
              </TooltipTrigger>
              {currentViewCollapsed && (
                <TooltipContent side="right">
                  <p>{item.title}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      });
    },
    [filteredNavItems, pathname, toggleMenu, expandedMenus, router]
  );

  const sidebarContent = (currentViewCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "flex items-center px-4 py-6",
          currentViewCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!currentViewCollapsed && (
          <h1 className="text-2xl font-bold text-primary">SmartDVM</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="rounded-full"
          aria-label={
            currentViewCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
        >
          {currentViewCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="p-4">
        {!currentViewCollapsed && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <ul
          className={cn("space-y-1", currentViewCollapsed ? "items-start" : "")}
        >
          {renderNavItems({ currentViewCollapsed })}
        </ul>
      </nav>

      {/* User info */}
      <div
        className={cn(
          "p-4 border-t border-border flex",
          currentViewCollapsed ? "justify-center" : "items-center gap-3"
        )}
      >
        {user && (
          <>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            {!currentViewCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || "Owner"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-background transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {sidebarContent(isCollapsed)}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="left" className="w-[260px] p-0 flex flex-col">
          {sidebarContent(false)}
        </SheetContent>
      </Sheet>
    </>
  );
}
