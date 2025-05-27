
"use client";

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
  Briefcase, // Placeholder for Patient Records
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type AppUserRole = 'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR' | 'CLIENT';

interface NavItem {
  title: string;
  href?: string; // Optional if it's a parent for a submenu
  icon: React.ElementType;
  keywords?: string[];
  active?: boolean; // Will be determined dynamically
  roles: AppUserRole[];
  submenu?: SubmenuItem[];
  onClick?: () => void; // For items that toggle submenus
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  keywords?: string[];
  active?: boolean; // Will be determined dynamically
  roles?: AppUserRole[];
}

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isLoading: userIsLoading, initialAuthChecked } = useUser();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const baseNavItems: NavItem[] = useMemo(() => [
    {
      title: "Dashboard",
      href: user?.role === 'CLIENT' ? "/client" : user?.role === 'ADMINISTRATOR' ? "/administrator" : user?.role === 'PRACTICE_ADMINISTRATOR' ? "/practice-administrator" : "/auth/login",
      icon: LayoutDashboard,
      keywords: ["home", "main", "overview"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT']
    },
    {
      title: "Services",
      href: "/", // Assuming root page lists services
      icon: Stethoscope,
      keywords: ["offerings", "treatments", "procedures"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT'] // All roles can view services
    },
    {
      title: "Favorites",
      href: "/favorites",
      icon: Heart,
      keywords: ["saved", "bookmarked", "liked"],
      roles: ['CLIENT']
    },
    {
      title: "Symptom Checker",
      href: "/symptom-checker",
      icon: Sparkles,
      keywords: ["ai", "diagnosis", "assessment", "pet health"],
      roles: ['CLIENT']
    },
    {
      title: "User Management",
      icon: Users,
      href: "/user-management", // Example top-level link
      keywords: ["users", "permissions", "accounts", "staff", "clients"],
      roles: ['ADMINISTRATOR'],
      submenu: [
        { title: "View Users", href: "/user-management/view", keywords: ["list", "all users"], roles: ['ADMINISTRATOR'] },
        { title: "Add User", href: "/user-management/add", keywords: ["new user", "create account"], roles: ['ADMINISTRATOR'] },
      ]
    },
    {
      title: "Patient Records", // Example from new sidebar structure
      icon: Briefcase, // Using Briefcase as a stand-in for medical records icon
      keywords: ["patients", "medical history", "charts"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'],
      submenu: [
        { title: "Search Patients", href: "/patients/search", keywords: ["find patient"] },
        { title: "New Patient", href: "/patients/new", keywords: ["add patient"] },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      keywords: ["options", "configuration", "preferences", "profile"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT'],
    },
  ], [user]);

  const filteredNavItems = useMemo(() => {
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
        sub.keywords?.some(sk => sk.toLowerCase().includes(lowerSearchTerm))
      );
      return matchesTitle || matchesKeywords || matchesSubmenu;
    }).map(item => {
      if (searchTerm && item.submenu) {
        const filteredSubmenu = item.submenu.filter(sub => 
            sub.title.toLowerCase().includes(lowerSearchTerm) ||
            sub.keywords?.some(sk => sk.toLowerCase().includes(lowerSearchTerm))
        );
        // If submenu items match, keep the parent. If only parent matches, show all its subitems.
        // If parent doesn't match but some subitems do, show only matching subitems.
        if (filteredSubmenu.length > 0) {
            return {...item, submenu: filteredSubmenu};
        } else if (item.title.toLowerCase().includes(lowerSearchTerm) || item.keywords?.some(k => k.toLowerCase().includes(lowerSearchTerm))) {
            return item; // Parent matches, show all its subitems
        }
        return null; // Parent doesn't match and no subitem matches
      }
      return item;
    }).filter(item => item !== null) as NavItem[];
  }, [user, userIsLoading, initialAuthChecked, baseNavItems, searchTerm]);


  useEffect(() => {
    const newExpandedState: Record<string, boolean> = {};
    filteredNavItems.forEach(item => {
      if (item.submenu && item.submenu.length > 0) {
        const isParentActive = item.href && pathname.startsWith(item.href);
        const isSubmenuActive = item.submenu.some(subItem => subItem.href && pathname.startsWith(subItem.href));
        if (isParentActive || isSubmenuActive) {
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus(newExpandedState);
  }, [pathname, filteredNavItems]);


  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getInitials = (emailOrName: string | undefined) => {
    if (!emailOrName) return 'U';
    const parts = emailOrName.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return emailOrName.substring(0, 2).toUpperCase();
  };

  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      const subItemsToShow = item.submenu?.filter(subItem => 
        !subItem.roles || (user?.role && subItem.roles.includes(user.role as AppUserRole))
      ) || [];

      const isActive = item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false;
      const isSubmenuPotentiallyActive = item.submenu?.some(subItem => subItem.href && pathname.startsWith(subItem.href));
      const isMenuExpanded = expandedMenus[item.title] || false;

      const linkContent = (
        <>
          <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
          {!isCollapsed && <span className="truncate flex-1">{item.title}</span>}
          {!isCollapsed && subItemsToShow.length > 0 && (
            isMenuExpanded ? <ChevronUp className="h-4 w-4 ml-auto opacity-70" /> : <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
          )}
        </>
      );

      const buttonOrLink = item.href && subItemsToShow.length === 0 ? (
        <Link 
          href={item.href}
          onClick={() => setMobileSheetOpen(false)}
          className={cn(
            "flex items-center w-full text-sm font-medium rounded-md px-3 py-2.5 transition-colors duration-150",
            "group",
            isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            isCollapsed && "justify-center py-3"
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
              // This case should ideally be handled by Link, but as a fallback
              // or if item.onClick is defined for navigation
              // router.push(item.href); // Would need useRouter from 'next/navigation'
              setMobileSheetOpen(false); 
            } else if (item.onClick) {
                item.onClick();
            }
          }}
          className={cn(
            "flex items-center w-full text-sm font-medium rounded-md px-3 py-2.5 transition-colors duration-150",
            "group justify-start text-left",
            (isActive || (isMenuExpanded && isSubmenuPotentiallyActive)) ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            isCollapsed && "justify-center py-3"
          )}
        >
          {linkContent}
        </Button>
      );

      return (
        <div key={item.title} className="w-full">
          {isCollapsed ? (
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
          
          {!isCollapsed && subItemsToShow.length > 0 && isMenuExpanded && (
            <div className="mt-1 space-y-1 pl-8 pr-2 py-1 border-l border-border/50 ml-[1.125rem] mr-1"> {/* Adjusted pl and ml for better alignment */}
              {subItemsToShow.map((subItem) => {
                const isSubItemActive = subItem.href && pathname.startsWith(subItem.href);
                const subLinkContent = (
                  <>
                    {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" />}
                    <span className="truncate">{subItem.title}</span>
                  </>
                );
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
                     {subLinkContent}
                    </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };
  
  const sidebarContent = (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", isCollapsed ? "items-center" : "")}>
      <div className={cn("flex h-16 items-center border-b border-border shrink-0", isCollapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setMobileSheetOpen(false)}>
          <HeartPulse className="h-7 w-7 text-primary" />
          {!isCollapsed && (
            <h1 className="text-xl">
               <span className="text-foreground">Smart</span><span className="text-primary">DVM</span>
            </h1>
          )}
        </Link>
      </div>

      {!isCollapsed && (
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
      {isCollapsed && (
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

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 px-2">
        {renderNavItems(filteredNavItems)}
      </nav>

      {user && initialAuthChecked && (
        <div className={cn("border-t border-border p-3 shrink-0", isCollapsed && "py-3")}>
          <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center flex-col" : "")}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
            )}
             <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-destructive", isCollapsed ? "h-9 w-9" : "h-8 w-8")} onClick={logout}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    {!isCollapsed && <span className="sr-only">Logout</span>}
                    {isCollapsed && <TooltipContent side="right" className="ml-2"><p>Logout</p></TooltipContent>}
                </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      {(userIsLoading && !initialAuthChecked) && (
         <div className="border-t p-4 text-center text-sm text-muted-foreground">Loading user...</div>
      )}
       <div className={cn("border-t border-border p-2 shrink-0", isCollapsed ? "py-2" : "")}>
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" className="w-full justify-center text-muted-foreground hover:text-primary" onClick={onToggleCollapse}>
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                {!isCollapsed && <span className="sr-only">{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>}
                 {isCollapsed && <TooltipContent side="right" className="ml-2"><p>{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</p></TooltipContent>}
            </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (conditionally rendered based on screen size by className) */}
      <div className={cn("hidden md:block", isCollapsed ? "w-20" : "w-64", "fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-in-out")}>
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Trigger (Hamburger Menu) */}
      {/* Position fixed to top-left, ensure it's on top of other content with z-index */}
      <div className="md:hidden fixed top-3 left-3 z-40"> 
         <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 p-0 bg-card shadow-md">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col bg-card border-r border-border">
            {/* Render the same sidebar content, but it won't be collapsible inside the sheet */}
            {/* Pass a "isMobile" prop or similar if sidebarContent needs to behave differently */}
            {React.cloneElement(sidebarContent, { isCollapsed: false })} 
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

