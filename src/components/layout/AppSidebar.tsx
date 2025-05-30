
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
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
  FileText as FileTextIcon, // Renamed to avoid conflict
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, type User as AppUserType, type AdministratorUser, type ClientUser, type PracticeAdminUser } from "@/context/UserContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AppUserRole = 'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR' | 'CLIENT';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  keywords?: string[];
  active?: boolean; // This will be calculated dynamically
  roles: AppUserRole[];
  submenu?: SubmenuItem[];
  onClick?: () => void; // For items that are not links but actions
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  keywords?: string[];
  active?: boolean; // This will be calculated dynamically
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
      href: "/", // Assuming this is the services listing page
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
      title: "User Management", // Example Admin feature
      icon: Users,
      href: "/user-management", // Placeholder path
      keywords: ["users", "permissions", "accounts", "staff", "clients", "admin"],
      roles: ['ADMINISTRATOR'],
      // Example submenu
      // submenu: [
      //   { title: "View Users", href: "/user-management/view", keywords: ["list", "all users"], roles: ['ADMINISTRATOR'] },
      //   { title: "Add User", href: "/user-management/add", keywords: ["new user", "create account"], roles: ['ADMINISTRATOR'] },
      // ]
    },
    {
      title: "Patient Records", // Example for Practice Admin and Admin
      icon: Briefcase, // Using Briefcase as an example icon
      keywords: ["patients", "medical history", "charts", "records"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'],
      submenu: [
        { title: "Search Patients", href: "/patients/search", keywords: ["find patient", "lookup"], roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'] }, // Placeholder
        { title: "New Patient", href: "/patients/new", keywords: ["add patient", "register patient"], roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'] }, // Placeholder
      ],
    },
    {
      title: "Practice Management", // Example for Practice Admin
      icon: Building, // Example icon
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
      // Only show login if definitely not logged in and auth check is complete
      return [
        {
          title: "Login",
          href: "/auth/login",
          icon: LogIn,
          roles: [] as AppUserRole[], // No specific role needed to see login
          keywords: ["signin", "access account"],
        },
      ];
    }
    if (!user?.role) return []; // Return empty if user role isn't available yet

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return baseNavItems.filter(item => {
      // Check if item role is among the user's roles
      const hasRole = item.roles.includes(user.role as AppUserRole);
      if (!hasRole) return false;

      // If no search term, item is visible (if role matches)
      if (!searchTerm) return true;

      // Check if title matches
      const matchesTitle = item.title.toLowerCase().includes(lowerSearchTerm);
      // Check if keywords match
      const matchesKeywords = item.keywords?.some(k => k.toLowerCase().includes(lowerSearchTerm));
      // Check if any submenu item title or keywords match
      const matchesSubmenu = item.submenu?.some(sub => 
        sub.title.toLowerCase().includes(lowerSearchTerm) || 
        (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm)))
      );

      return matchesTitle || matchesKeywords || matchesSubmenu;
    }).map(item => {
      // If searching and item has a submenu, filter the submenu items as well
      if (searchTerm && item.submenu) {
        const filteredSubmenu = item.submenu.filter(sub => 
            (sub.roles ? sub.roles.includes(user.role as AppUserRole) : true) && // Check submenu item roles too
            (sub.title.toLowerCase().includes(lowerSearchTerm) ||
            (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm))))
        );
        // If submenu has matching items, return item with filtered submenu
        if (filteredSubmenu.length > 0) {
            return {...item, submenu: filteredSubmenu};
        }
        // If no submenu items match, but parent item title/keywords match, show parent without submenu
        else if (item.title.toLowerCase().includes(lowerSearchTerm) || (item.keywords && item.keywords.some(k => k.toLowerCase().includes(lowerSearchTerm)))) {
            return {...item, submenu: []}; // Or just item, if submenu shouldn't show
        }
        // If neither parent nor submenu matches, filter out this item
        return null; 
      }
      return item;
    }).filter(item => item !== null) as NavItem[]; // Ensure null items (filtered out) are removed
  }, [user, userIsLoading, initialAuthChecked, baseNavItems, searchTerm]);


  React.useEffect(() => {
    const newExpandedState: Record<string, boolean> = {};
    filteredNavItems.forEach(item => {
      if (item.submenu && item.submenu.length > 0) {
        // Check if the current path starts with the parent item's href (if it has one)
        const isParentActive = item.href && pathname.startsWith(item.href) && item.href !== '/'; // Avoid expanding for root if it has submenus
         // Check if any submenu item is active
        const isSubmenuActive = item.submenu.some(subItem => subItem.href && pathname.startsWith(subItem.href));
        
        if (isParentActive || isSubmenuActive || (searchTerm && item.submenu.length > 0) ) { // Keep expanded if searching and parent has (filtered) submenu items
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus(prev => ({...prev, ...newExpandedState})); // Merge with previous to preserve manual toggles not overridden by path
  }, [pathname, filteredNavItems, searchTerm]);


  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getInitials = (emailOrName: string | undefined): string => {
    if (!emailOrName) return 'U';
    const name = (user as AppUserType)?.name; // Prioritize name
    const target = name || emailOrName;

    const parts = target.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return target.substring(0, 2).toUpperCase();
  };

  const renderNavItems = React.useCallback(({ currentViewCollapsed }: { currentViewCollapsed: boolean }) => {
    return filteredNavItems.map((item) => {
      // Filter submenu items based on current user's role for display
      const subItemsToShow = item.submenu?.filter(subItem => 
        !subItem.roles || (user?.role && subItem.roles.includes(user.role as AppUserRole))
      ) || [];

      // Determine if the main item or any of its sub-items are active
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

      const buttonOrLink = item.href && subItemsToShow.length === 0 ? (
        <Link 
          href={item.href}
          onClick={() => {
            if (item.onClick) item.onClick(); // Call onClick if defined
            setMobileSheetOpen(false); // Always close mobile sheet on link click
          }}
          className={cn(
            "flex items-center w-full text-sm font-medium rounded-md px-3 py-2.5 transition-colors duration-150",
            "group",
            isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            currentViewCollapsed && "justify-center py-3"
          )}
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
              // This case should ideally be handled by the Link above if no subitems.
              // If it's a button-like item with an action but no direct href for primary action:
              if (item.onClick) item.onClick();
              setMobileSheetOpen(false); 
            } else if (item.onClick) { // Pure action button
                item.onClick();
                setMobileSheetOpen(false);
            }
          }}
          className={cn(
            "flex items-center w-full text-sm font-medium rounded-md px-3 py-2.5 transition-colors duration-150",
            "group justify-start text-left", // Ensure text is left-aligned
            isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            currentViewCollapsed && "justify-center py-3"
          )}
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
            <div className="mt-1 space-y-1 pl-8 pr-2 py-1 border-l border-border/50 ml-[1.125rem] mr-1"> {/* Adjusted margin for indicator line */}
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
                     {subItem.icon && <subItem.icon className="mr-2 h-4 w-4 shrink-0" />} {/* Optional icon for subitems */}
                     <span className="truncate">{subItem.title}</span>
                    </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNavItems, pathname, expandedMenus, user, toggleMenu]); // Added toggleMenu to deps

  const CollapseToggleButton = ({ forCollapsedView = false }: { forCollapsedView?: boolean }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-primary shrink-0",
              forCollapsedView ? "h-10 w-10 mx-auto my-1" : "h-8 w-8", // Adjust size for different contexts
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
    <div className={cn("flex flex-col h-full bg-card border-r border-border", effectiveIsCollapsed ? "" : "")}> {/* items-center removed to allow header structure */}
      {/* Sidebar Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-border shrink-0",
        effectiveIsCollapsed ? "justify-center px-1 py-1" : "justify-between px-4" // px-1 py-1 for collapsed allows button to fit
      )}>
        {!effectiveIsCollapsed && (
          <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setMobileSheetOpen(false)}>
            <HeartPulse className="h-7 w-7 text-primary shrink-0" />
            <h1 className="text-xl">
               <span className="text-foreground">Smart</span><span className="text-primary">DVM</span>
            </h1>
          </Link>
        )}
        {/* Show toggle button: always if collapsed, or only if not collapsed for expanded view */}
        {(effectiveIsCollapsed || !effectiveIsCollapsed) && (
           <CollapseToggleButton forCollapsedView={effectiveIsCollapsed} />
        )}
      </div>

      {/* Search Input - only if not collapsed */}
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
      {/* Search Icon - only if collapsed and on desktop (alternative to full search input) */}
      {/* This is more of a placeholder; ideally, clicking it would expand the sidebar or open a modal */}
      {effectiveIsCollapsed && !mobileSheetOpen && ( // Ensure not in mobile sheet
         <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="my-3 h-9 w-9 text-muted-foreground hover:text-primary" onClick={onToggleCollapse}>
                        <SearchIcon className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                    <p>Search (Expand Sidebar)</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      )}

      {/* Navigation Items */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1", effectiveIsCollapsed ? "px-2" : "px-3")}>
        {renderNavItems({ currentViewCollapsed: effectiveIsCollapsed })}
      </nav>

      {/* User Info & Logout */}
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
      {(userIsLoading && !initialAuthChecked) && ( // Show loading state if user is loading and initial check not done
         <div className={cn("border-t p-4 text-center text-sm text-muted-foreground", effectiveIsCollapsed && "py-3")}>Loading user...</div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
          "hidden md:block", 
          isCollapsed ? "w-20" : "w-64", 
          "fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out" // Ensure z-index is high enough
        )}
      >
        {renderSidebarContent({ effectiveIsCollapsed: isCollapsed })}
      </div>

      {/* Mobile Sidebar Trigger (Hamburger Menu) - Placed in AppHeader for better UX */}
      {/* The trigger is now expected to be part of AppHeader if this sidebar is purely for content */}
      {/* If AppSidebar should manage its own mobile trigger, place it here, typically fixed position */}
      <div className="md:hidden fixed top-3 left-3 z-50"> {/* z-50 to be above header if header is z-30 or z-40 */}
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

    