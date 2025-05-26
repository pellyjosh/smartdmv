
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HeartPulse, 
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  Stethoscope, // For "Services" (VetConnectPro original)
  Heart,       // For "Favorites" (VetConnectPro original)
  Sparkles,    // For "Symptom Checker" (VetConnectPro original)
  LogOut,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser, type User } from "@/context/UserContext"; // Ensure User type is imported
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Define UserRole mapping from UserContext to a local enum/type if needed, or use strings directly
type AppUserRole = 'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR' | 'CLIENT';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  active?: boolean; // Will be determined dynamically
  roles: AppUserRole[];
  submenu?: SubmenuItem[];
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  active?: boolean; // Will be determined dynamically
  roles?: AppUserRole[]; // Optional: submenus might inherit parent roles or have their own
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, isLoading: userIsLoading, initialAuthChecked } = useUser();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Define navigation items based on current app structure and roles
  const baseNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: user?.role === 'CLIENT' ? "/client" : user?.role === 'ADMINISTRATOR' ? "/administrator" : user?.role === 'PRACTICE_ADMINISTRATOR' ? "/practice-administrator" : "/auth/login",
      icon: LayoutDashboard,
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT']
    },
    {
      title: "Services", // From VetConnectPro original
      href: "/", // Root page for services
      icon: Stethoscope,
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT']
    },
    {
      title: "Favorites", // From VetConnectPro original
      href: "/favorites",
      icon: Heart,
      roles: ['CLIENT']
    },
    {
      title: "Symptom Checker", // From VetConnectPro original
      href: "/symptom-checker",
      icon: Sparkles,
      roles: ['CLIENT']
    },
    {
      title: "User Management",
      href: "/user-management", // Placeholder
      icon: Users,
      roles: ['ADMINISTRATOR'],
      submenu: [
        { title: "View Users", href: "/user-management/view", roles: ['ADMINISTRATOR'] },
        { title: "Add User", href: "/user-management/add", roles: ['ADMINISTRATOR'] },
      ]
    },
    {
      title: "Settings",
      href: "/settings", // Placeholder
      icon: Settings,
      roles: ['ADMINISTRATOR', 'PRACTICE_ADMINISTRATOR', 'CLIENT'],
    },
  ];

  useEffect(() => {
    // Auto-expand menu if a submenu item is active
    const newExpandedState: Record<string, boolean> = {};
    baseNavItems.forEach(item => {
      if (item.submenu) {
        const isActiveParent = pathname.startsWith(item.href);
        const isSubmenuActive = item.submenu.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
        if (isActiveParent || isSubmenuActive) {
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus(prev => ({...prev, ...newExpandedState}));
  }, [pathname, baseNavItems]);


  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const filteredNavItems = baseNavItems.filter(item => 
    user?.role && item.roles.includes(user.role as AppUserRole)
  );
  
  if (pathname === '/auth/login') {
    return null; // Don't render sidebar on login page
  }

  const renderNavItems = (items: NavItem[], isSubmenu: boolean = false) => {
    return items.map((item) => {
      // Filter submenu items based on role if roles are defined for them
      const subItemsToShow = item.submenu?.filter(subItem => 
        !subItem.roles || (user?.role && subItem.roles.includes(user.role as AppUserRole))
      ) || [];

      const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
      const isSubmenuActive = item.submenu?.some(subItem => pathname.startsWith(subItem.href));

      return (
        <div key={item.href} className={isSubmenu ? "pl-4" : ""}>
          <div>
            {subItemsToShow.length > 0 ? (
              <Button
                variant={isActive || isSubmenuActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start group",
                  (isActive || isSubmenuActive) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => toggleMenu(item.title)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
                {expandedMenus[item.title] ? <ChevronUp className="ml-auto h-4 w-4 group-hover:text-accent-foreground" /> : <ChevronDown className="ml-auto h-4 w-4 group-hover:text-accent-foreground" />}
              </Button>
            ) : (
              <Link 
                href={item.href}
                onClick={() => setMobileSheetOpen(false)}
              >
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            )}
          </div>
          
          {subItemsToShow.length > 0 && expandedMenus[item.title] && (
            <div className="mt-1 space-y-1 pl-6 border-l border-border ml-3">
              {subItemsToShow.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  onClick={() => setMobileSheetOpen(false)}
                >
                  <Button
                    variant={pathname.startsWith(subItem.href) ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start text-muted-foreground",
                       pathname.startsWith(subItem.href) ? "text-primary font-medium" : "hover:text-primary"
                    )}
                  >
                    {subItem.icon && <subItem.icon className="mr-2 h-3 w-3" />}
                    {subItem.title}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    });
  };
  
  const sidebarContent = (
    <>
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileSheetOpen(false)}>
          <HeartPulse className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">
             <span className="text-foreground">Smart</span><span className="text-primary">DVM</span>
          </h1>
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Main Navigation
          </h2>
          <div className="space-y-1">
            {renderNavItems(filteredNavItems)}
            {(!user && initialAuthChecked) && (
                <Link 
                    href="/auth/login"
                    onClick={() => setMobileSheetOpen(false)}
                >
                    <Button
                    variant={pathname === "/auth/login" ? "secondary" : "ghost"}
                    className={cn(
                        "w-full justify-start",
                        pathname === "/auth/login" ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    >
                    <LogOut className="mr-2 h-4 w-4" /> 
                    Login
                    </Button>
                </Link>
            )}
          </div>
        </div>
      </nav>
      {user && initialAuthChecked && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{user.name || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      )}
      {(userIsLoading && !initialAuthChecked) && (
         <div className="border-t p-4 text-center text-sm text-muted-foreground">Loading user...</div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-64 flex-col bg-card border-r fixed left-0 top-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Trigger (Hamburger Menu) */}
      <div className="md:hidden fixed top-3 left-3 z-50">
         <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 p-0">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
