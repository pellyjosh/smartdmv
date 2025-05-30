
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react'; // Changed import
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
import { useUser, type User as AppUserType } from "@/context/UserContext"; // Renamed User to AppUserType
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type AppUserRole = 'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR' | 'CLIENT';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  keywords?: string[];
  active?: boolean;
  roles: AppUserRole[];
  submenu?: SubmenuItem[];
  onClick?: () => void;
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  keywords?: string[];
  active?: boolean;
  roles?: AppUserRole[];
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
      title: "Services",
      href: "/",
      icon: Stethoscope,
      keywords: ["offerings", "treatments", "procedures", "vet"],
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
      href: "/user-management",
      keywords: ["users", "permissions", "accounts", "staff", "clients", "admin"],
      roles: ['ADMINISTRATOR'],
      submenu: [
        { title: "View Users", href: "/user-management/view", keywords: ["list", "all users"], roles: ['ADMINISTRATOR'] },
        { title: "Add User", href: "/user-management/add", keywords: ["new user", "create account"], roles: ['ADMINISTRATOR'] },
      ]
    },
    {
      title: "Patient Records",
      icon: Briefcase,
      keywords: ["patients", "medical history", "charts", "records"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR'],
      submenu: [
        { title: "Search Patients", href: "/patients/search", keywords: ["find patient", "lookup"] },
        { title: "New Patient", href: "/patients/new", keywords: ["add patient", "register patient"] },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      keywords: ["options", "configuration", "preferences", "profile", "account"],
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT'],
    },
  ], [user]);

  const filteredNavItems = React.useMemo(() => {
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
            (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm)))
        );
        if (filteredSubmenu.length > 0) {
            return {...item, submenu: filteredSubmenu};
        } else if (item.title.toLowerCase().includes(lowerSearchTerm) || (item.keywords && item.keywords.some(k => k.toLowerCase().includes(lowerSearchTerm)))) {
            return item; 
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
        const isParentActive = item.href && pathname.startsWith(item.href);
        const isSubmenuActive = item.submenu.some(subItem => subItem.href && pathname.startsWith(subItem.href));
        if (isParentActive || isSubmenuActive || searchTerm) { // Keep expanded if searching and parent is visible
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus(newExpandedState);
  }, [pathname, filteredNavItems, searchTerm]);


  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getInitials = (emailOrName: string | undefined) => {
    if (!emailOrName) return 'U';
    const parts = emailOrName.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return emailOrName.substring(0, 2).toUpperCase();
  };

  const renderNavItems = React.useCallback(({ currentViewCollapsed }: { currentViewCollapsed: boolean }) => {
    return filteredNavItems.map((item) => {
      const subItemsToShow = item.submenu?.filter(subItem => 
        !subItem.roles || (user?.role && subItem.roles.includes(user.role as AppUserRole))
      ) || [];

      const isActive = item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false;
      const isSubmenuPotentiallyActive = item.submenu?.some(subItem => subItem.href && pathname.startsWith(subItem.href));
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
          onClick={() => setMobileSheetOpen(false)}
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
              setMobileSheetOpen(false);
              // router.push(item.href); // No direct router push here, Link handles it
            } else if (item.onClick) {
                item.onClick();
            }
          }}
          className={cn(
            "flex items-center w-full text-sm font-medium rounded-md px-3 py-2.5 transition-colors duration-150",
            "group justify-start text-left",
            (isActive || (isMenuExpanded && isSubmenuPotentiallyActive)) ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNavItems, pathname, expandedMenus, user, toggleMenu]); // Added toggleMenu to deps

  const renderSidebarContent = ({ effectiveIsCollapsed }: { effectiveIsCollapsed: boolean }) => (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", effectiveIsCollapsed ? "items-center" : "")}>
      <div className={cn("flex h-16 items-center border-b border-border shrink-0", effectiveIsCollapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setMobileSheetOpen(false)}>
          <HeartPulse className="h-7 w-7 text-primary shrink-0" />
          {!effectiveIsCollapsed && (
            <h1 className="text-xl">
               <span className="text-foreground">Smart</span><span className="text-primary">DVM</span>
            </h1>
          )}
        </Link>
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
      {effectiveIsCollapsed && (
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
        {renderNavItems({ currentViewCollapsed: effectiveIsCollapsed })}
      </nav>

      {user && initialAuthChecked && (
        <div className={cn("border-t border-border p-3 shrink-0", effectiveIsCollapsed && "py-3")}>
          <div className={cn("flex items-center gap-3", effectiveIsCollapsed ? "justify-center flex-col" : "")}>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.name || user.email)}
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
       <div className={cn("border-t border-border p-2 shrink-0", effectiveIsCollapsed ? "py-2" : "")}>
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" className="w-full justify-center text-muted-foreground hover:text-primary" onClick={onToggleCollapse}>
                        {effectiveIsCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                {!effectiveIsCollapsed && <span className="sr-only">{effectiveIsCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>}
                 {effectiveIsCollapsed && <TooltipContent side="right" className="ml-2"><p>{effectiveIsCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</p></TooltipContent>}
            </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <>
      <div className={cn("hidden md:block", isCollapsed ? "w-20" : "w-64", "fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-in-out")}>
        {renderSidebarContent({ effectiveIsCollapsed: isCollapsed })}
      </div>
      <div className="md:hidden fixed top-3 left-3 z-40"> 
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
