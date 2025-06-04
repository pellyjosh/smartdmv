
"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  Stethoscope,
  Heart,
  Sparkles,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  Search as SearchIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  Building,
  FileText as FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, type User as AppUserType } from "@/context/UserContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define simplified roles for this sidebar example, mapping to UserContext roles
type AppUserRole = 'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR' | 'CLIENT';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  keywords?: string[];
  roles: AppUserRole[];
  submenu?: SubmenuItem[];
  onClick?: () => void;
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType; // Optional icon for submenu items
  keywords?: string[];
  roles?: AppUserRole[]; // Roles for submenu items if they differ from parent
}

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isLoading: userIsLoading, initialAuthChecked } = useUser();
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = React.useState("");

  const baseNavItems: NavItem[] = React.useMemo(() => [
    {
      title: "Dashboard",
      href: user?.role === 'CLIENT' ? "/client" : user?.role === 'ADMINISTRATOR' ? "/administrator" : user?.role === 'PRACTICE_ADMINISTRATOR' ? "/practice-administrator" : "/auth/login",
      icon: LayoutDashboard,
      keywords: ["home", "main", "overview"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT']
    },
    {
      title: "Vet Services",
      href: "/",
      icon: Stethoscope,
      keywords: ["offerings", "treatments", "procedures", "vet", "clinics", "hospitals"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT']
    },
    {
      title: "Favorites",
      href: "/favorites",
      icon: Heart,
      keywords: ["saved", "bookmarked", "liked", "pets"],
      roles: ['CLIENT']
    },
    {
      title: "Symptom Checker",
      href: "/symptom-checker",
      icon: Sparkles,
      keywords: ["ai", "diagnosis", "assessment", "pet health", "check"],
      roles: ['CLIENT']
    },
    {
      title: "User Management",
      icon: Users,
      href: "/user-management", // Placeholder
      keywords: ["users", "permissions", "accounts", "staff", "clients", "admin"],
      roles: ['ADMINISTRATOR'],
    },
    {
      title: "Patient Records",
      icon: Briefcase,
      keywords: ["patients", "medical history", "charts", "records"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'],
      submenu: [
        { title: "Search Patients", href: "/patients/search", keywords: ["find patient", "lookup"], roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'] },
        { title: "New Patient", href: "/patients/new", keywords: ["add patient", "register patient"], roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'] },
      ],
    },
    {
      title: "Practice Management",
      icon: Building,
      href: "/practice-settings", // Placeholder
      keywords: ["practice", "clinic settings", "operations"],
      roles: ['PRACTICE_ADMINISTRATOR'],
    },
    {
      title: "Settings",
      href: "/settings", // Placeholder
      icon: Settings,
      keywords: ["options", "configuration", "preferences", "profile", "account"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT'],
    },
  ], [user]);

  const filteredNavItems: NavItem[] = React.useMemo(() => {
    if (!user?.role && !userIsLoading && initialAuthChecked) {
      return [
        {
          title: "Login",
          href: "/auth/login",
          icon: LogIn,
          roles: [] as AppUserRole[],
          keywords: ["signin", "access account"],
        },
      ];
    }
    if (!user?.role) return [];

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return baseNavItems.filter(item => {
      const hasRole = item.roles.includes(user.role as AppUserRole);
      if (!hasRole) return false;

      if (!searchTerm) return true;

      const matchesTitle = item.title.toLowerCase().includes(lowerSearchTerm);
      const matchesKeywords = item.keywords?.some(k => k.toLowerCase().includes(lowerSearchTerm));
      const matchesSubmenu = item.submenu?.some(sub => 
        sub.title.toLowerCase().includes(lowerSearchTerm) || 
        (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm)))
      );

      return matchesTitle || matchesKeywords || matchesSubmenu;
    }).map(item => {
      if (searchTerm && item.submenu) {
        const filteredSubmenu = item.submenu.filter(sub => 
            (sub.roles ? sub.roles.includes(user.role as AppUserRole) : true) &&
            (sub.title.toLowerCase().includes(lowerSearchTerm) ||
            (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm))))
        );
        if (filteredSubmenu.length > 0) {
            return {...item, submenu: filteredSubmenu};
        }
        else if (item.title.toLowerCase().includes(lowerSearchTerm) || (item.keywords && item.keywords.some(k => k.toLowerCase().includes(lowerSearchTerm)))) {
            return {...item, submenu: []}; 
        }
        return null; 
      }
      return item;
    }).filter(item => item !== null) as NavItem[];
  }, [user, userIsLoading, initialAuthChecked, baseNavItems, searchTerm]);

  React.useEffect(() => {
    const newExpandedState: Record<string, boolean> = {};
    filteredNavItems.forEach(item => {
      if (item.submenu && item.submenu.length > 0) {
        const isParentActive = item.href && pathname.startsWith(item.href) && item.href !== '/';
        const isSubmenuActive = item.submenu.some(subItem => subItem.href && pathname.startsWith(subItem.href));
        
        if (isParentActive || isSubmenuActive || (searchTerm && item.submenu.length > 0) ) {
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus(prev => ({...prev, ...newExpandedState}));
  }, [pathname, filteredNavItems, searchTerm]);

  const toggleMenu = React.useCallback((title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  const getInitials = (emailOrName: string | undefined): string => {
    if (!emailOrName) return 'U';
    const name = (user as AppUserType)?.name;
    const target = name || emailOrName;

    const parts = target.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return target.substring(0, 2).toUpperCase();
  };

  const renderNavItems = React.useCallback(({ currentViewCollapsed }: { currentViewCollapsed: boolean }) => {
    return filteredNavItems.map((item) => {
      const subItemsToShow = item.submenu?.filter(subItem => 
        !subItem.roles || (user?.role && subItem.roles.includes(user.role as AppUserRole))
      ) || [];

      let isActive = item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false;
      if (!isActive && subItemsToShow.length > 0) {
        isActive = subItemsToShow.some(subItem => subItem.href && pathname.startsWith(subItem.href));
      }
      
      const isMenuExpanded = expandedMenus[item.title] || false;

      const linkContent = (
        <>
          <item.icon className={cn("h-5 w-5", currentViewCollapsed ? "mx-auto" : "mr-3 shrink-0")} />
          {!currentViewCollapsed && <span className="truncate flex-1">{item.title}</span>}
          {!currentViewCollapsed && subItemsToShow.length > 0 && (
            isMenuExpanded ? <ChevronUp className="h-4 w-4 ml-auto opacity-70 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-auto opacity-70 shrink-0" />
          )}
        </>
      );

      const commonButtonClasses = cn(
        "flex items-center w-full text-sm font-medium rounded-md transition-colors duration-150",
        "group",
        isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
         currentViewCollapsed ? "justify-center py-3 px-0" : "px-3 py-2.5"
      );
      
      const buttonOrLink = item.href && subItemsToShow.length === 0 ? (
        <Link 
          href={item.href}
          onClick={() => {
            if (item.onClick) item.onClick();
            setMobileSheetOpen(false);
          }}
          className={commonButtonClasses}
        >
          {linkContent}
        </Link>
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            if (subItemsToShow.length > 0) {
              toggleMenu(item.title);
            } else if (item.href) {
              if (item.onClick) item.onClick();
              setMobileSheetOpen(false); 
            } else if (item.onClick) {
                item.onClick();
                setMobileSheetOpen(false);
            }
          }}
          className={cn(commonButtonClasses, "justify-start text-left")}
          aria-expanded={subItemsToShow.length > 0 ? isMenuExpanded : undefined}
        >
          {linkContent}
        </Button>
      );

      return (
        <div key={item.title} className="w-full">
          {currentViewCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>{buttonOrLink}</TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            buttonOrLink
          )}
          
          {!currentViewCollapsed && subItemsToShow.length > 0 && isMenuExpanded && (
            <div className="mt-1 space-y-1 pl-8 pr-2 py-1 border-l border-border/50 ml-[1.125rem] mr-1">
              {subItemsToShow.map((subItem) => {
                const isSubItemActive = subItem.href && pathname.startsWith(subItem.href);
                return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={() => setMobileSheetOpen(false)}
                      className={cn(
                        "flex items-center w-full text-xs font-medium rounded-md px-3 py-2 transition-colors duration-150",
                        "group",
                        isSubItemActive ? "text-primary" : "text-foreground/60 hover:text-primary hover:bg-primary/5"
                      )}
                    >
                     {subItem.icon && <subItem.icon className="mr-2 h-4 w-4 shrink-0" />}
                     <span className="truncate">{subItem.title}</span>
                    </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  }, [filteredNavItems, pathname, expandedMenus, user, toggleMenu]);

  const CollapseToggleButton = ({ forCollapsedView = false }: { forCollapsedView?: boolean }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-primary shrink-0",
               // Make the button slightly smaller and adjust margin for better fit next to logo
              forCollapsedView ? "h-9 w-9" : "h-8 w-8 ml-auto",
            )}
            onClick={onToggleCollapse}
          >
            {isCollapsed || forCollapsedView ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          <p>{isCollapsed || forCollapsedView ? "Expand Sidebar" : "Collapse Sidebar"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderSidebarContent = ({ effectiveIsCollapsed }: { effectiveIsCollapsed: boolean }) => (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", effectiveIsCollapsed ? "" : "")}>
      <div className={cn(
        "flex h-16 items-center border-b border-border shrink-0",
        effectiveIsCollapsed ? "justify-center px-1 py-1" : "px-4" // Keep padding for expanded
      )}>
        {!effectiveIsCollapsed && (
          <Link href="/" className="flex items-center gap-2 font-semibold mr-2" onClick={() => setMobileSheetOpen(false)}>
            <h1 className="text-xl">
               <span className="text-foreground">SmartDVM</span>
            </h1>
          </Link>
        )}
         <CollapseToggleButton forCollapsedView={effectiveIsCollapsed} />
      </div>

      {!effectiveIsCollapsed && (
        <div className="p-3 border-b border-border">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search menu..."
              className="pl-9 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      {effectiveIsCollapsed && !mobileSheetOpen && (
         <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="my-3 h-9 w-9 text-muted-foreground hover:text-primary mx-auto" onClick={onToggleCollapse}>
                        <SearchIcon className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                    <p>Search (Expand Sidebar)</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      )}

      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1", effectiveIsCollapsed ? "px-2" : "px-3")}>
        {renderNavItems({ currentViewCollapsed: effectiveIsCollapsed })}
      </nav>

      {user && initialAuthChecked && (
        <div className={cn("border-t border-border p-3 shrink-0", effectiveIsCollapsed && "py-3")}>
          <div className={cn("flex items-center gap-3", effectiveIsCollapsed ? "justify-center flex-col" : "")}>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.email)} 
              </AvatarFallback>
            </Avatar>
            {!effectiveIsCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
            )}
             <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-destructive shrink-0", effectiveIsCollapsed ? "h-9 w-9" : "h-8 w-8")} onClick={logout}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    {!effectiveIsCollapsed && <span className="sr-only">Logout</span>}
                    {effectiveIsCollapsed && <TooltipContent side="right" className="ml-2"><p>Logout</p></TooltipContent>}
                </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      {(userIsLoading && !initialAuthChecked) && (
         <div className={cn("border-t p-4 text-center text-sm text-muted-foreground", effectiveIsCollapsed && "py-3")}>Loading user...</div>
      )}
    </div>
  );

  return (
    <>
      <div className={cn(
          "hidden md:block", 
          isCollapsed ? "w-20" : "w-64", 
          "fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out"
        )}
      >
        {renderSidebarContent({ effectiveIsCollapsed: isCollapsed })}
      </div>

      <div className="md:hidden fixed top-3 left-3 z-50">
         <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 p-0 bg-card shadow-md">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col bg-card border-r border-border">
            {renderSidebarContent({ effectiveIsCollapsed: false })} 
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
