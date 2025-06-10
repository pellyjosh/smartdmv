"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  Stethoscope,
  Menu,
  Heart,
  Sparkles,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  Search as SearchIcon,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  Globe,
  Video,
  UsersRound,
  ClipboardList,
  Archive,
  Settings2,
  BarChart3,
  Paintbrush,
  HelpCircle,
  Calendar,
  ClipboardCheck,
  VideoIcon,
  Building2,
  Pill,
  FileEdit,
  Tablet,
  Microscope,
  FlaskConical,
  AlertTriangle,
  CircuitBoard,
  Package,
  Warehouse,
  CreditCard,
  Trophy,
  Receipt,
  CircleDollarSign,
  DollarSign,
  ShoppingCart,
  User,
  ListFilter,
  Trash2,
  Network,
  ShieldAlert,
  LineChart,
  AppWindow,
  FolderOpen,
  BadgeHelp,
  Gauge,
  Boxes,
  Mail,
  AtSign,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, type User as AppUserType } from "@/context/UserContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

// --- Type Definitions (Unchanged) ---

type AppUserRole =
  'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR' | 'CLIENT' |
  'PRACTICE_ADMIN' | 'PRACTICE_MANAGER' |
  'VETERINARIAN' | 'TECHNICIAN' | 'RECEPTIONIST' |
  'ACCOUNTANT' | 'CASHIER' | 'OFFICE_MANAGER';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: AppUserRole[];
  keywords?: string[];
  marketplaceAddOn?: boolean;
}

// Adjusted MenuGroup to correctly distinguish between a direct link and a group with items
interface MenuGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  roles: AppUserRole[];
  href?: string; // Optional: exists if it's a direct link (like a dashboard), not if it's a parent of submenu items
  items?: MenuItem[]; // Optional: exists if it's a parent of submenu items
  keywords?: string[];
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  keywords?: string[];
  roles: AppUserRole[];
  submenu?: SubmenuItem[];
  onClick?: () => void;
  isAddon?: boolean;
  requiresWebsiteIntegration?: boolean;
}

interface SubmenuItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  keywords?: string[];
  roles?: AppUserRole[];
  isAddon?: boolean;
  requiresWebsiteIntegration?: boolean;
}

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// --- Modified Menu Data ---
const menuGroups: MenuGroup[] = [
  // Dashboard for Administrator (direct link)
  {
    id: "admin-dashboard",
    title: "Admin Dashboard",
    href: "/administrator",
    icon: LayoutDashboard,
    keywords: ["home", "main", "overview", "admin panel"],
    roles: ['ADMINISTRATOR']
  },
  // Dashboard for Practice Administrator (direct link)
  {
    id: "practice-admin-dashboard",
    title: "Practice Admin Dashboard",
    href: "/practice-administrator",
    icon: LayoutDashboard,
    keywords: ["home", "main", "overview", "practice admin panel"],
    roles: ['PRACTICE_ADMINISTRATOR', 'PRACTICE_ADMIN']
  },
  // Dashboard for Client (direct link)
  {
    id: "client-dashboard",
    title: "Client Dashboard",
    href: "/client",
    icon: LayoutDashboard,
    keywords: ["home", "main", "overview", "my pets"],
    roles: ['CLIENT']
  },
  // Client-specific menu items (now direct links)
  {
    id: "client-favorites",
    title: "Favorites",
    href: "/favorites",
    icon: Heart,
    keywords: ["saved", "bookmarked", "liked", "pets"],
    roles: ['CLIENT']
  },
  {
    id: "client-symptom-checker",
    title: "Symptom Checker",
    href: "/symptom-checker",
    icon: Sparkles,
    keywords: ["ai", "diagnosis", "assessment", "pet health", "check"],
    roles: ['CLIENT']
  },
  {
    id: "client-vet-services",
    title: "Vet Services",
    href: "/vet-services",
    icon: ClipboardList,
    keywords: ["offerings", "treatments", "procedures", "vet", "clinics", "hospitals"],
    roles: ['CLIENT']
  },
  {
    id: "client-settings",
    title: "Client Settings",
    href: "/client-settings",
    icon: Settings,
    keywords: ["options", "configuration", "preferences", "profile", "account"],
    roles: ['CLIENT'],
  },
  // Existing Menu Groups (with submenus)
  {
    id: "appointments",
    title: "Appointments",
    icon: Calendar,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"],
    items: [
      {
        title: "Appointments",
        href: "/appointments",
        icon: Calendar,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"]
      },
      {
        title: "Website Requests",
        href: "/appointment-requests",
        icon: ClipboardCheck,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "RECEPTIONIST"],
        marketplaceAddOn: true
      },
      {
        title: "Telemedicine",
        href: "/telemedicine",
        icon: VideoIcon,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"],
        marketplaceAddOn: true
      }
    ]
  },
  {
    id: "patients",
    title: "Patient Care",
    icon: Users,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"],
    items: [
      {
        title: "Clients & Pets",
        href: "/clients",
        icon: Users,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"]
      },
      {
        title: "Pet Admissions",
        href: "/pet-admissions",
        icon: Building2,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Health Plans",
        href: "/health-plans",
        icon: Heart,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "RECEPTIONIST"]
      },
      {
        title: "Vaccinations",
        href: "/vaccinations",
        icon: Pill,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      }
    ]
  },
  {
    id: "medicalRecords",
    title: "Medical Records",
    icon: FileEdit,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"],
    items: [
      {
        title: "SOAP Notes",
        href: "/soap-notes",
        icon: FileEdit,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Patient Timeline",
        href: "/patient-timeline",
        icon: ClipboardList,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Whiteboard",
        href: "/whiteboard",
        icon: Tablet,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Checklists",
        href: "/checklists",
        icon: ClipboardList,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      }
    ]
  },
  {
    id: "clinicalTools",
    title: "Clinical Tools",
    icon: Stethoscope,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"],
    items: [
      {
        title: "Lab Integration",
        href: "/lab-integration",
        icon: Microscope,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Medical Imaging",
        href: "/medical-imaging",
        icon: FlaskConical,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Disease Reporting",
        href: "/disease-reporting",
        icon: AlertTriangle,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN"],
        marketplaceAddOn: true
      },
      {
        title: "AI Diagnostic Assistant",
        href: "/ai-diagnostic-assistant",
        icon: CircuitBoard,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN"]
      }
    ]
  },
  {
    id: "inventory",
    title: "Inventory & Services",
    icon: Package,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT", "CASHIER", "OFFICE_MANAGER"],
    items: [
      {
        title: "Inventory",
        href: "/inventory",
        icon: Package,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
      },
      {
        title: "Boarding",
        href: "/boarding",
        icon: Warehouse,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"]
      },
      {
        title: "Point of Sale",
        href: "/pos",
        icon: CreditCard,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT", "RECEPTIONIST", "CASHIER", "OFFICE_MANAGER"],
        marketplaceAddOn: true
      },
      {
        title: "Referrals",
        href: "/referrals",
        icon: Trophy,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN"]
      }
    ]
  },
  {
    id: "financial",
    title: "Financial",
    icon: CreditCard,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT", "RECEPTIONIST"],
    items: [
      {
        title: "Client Billing",
        href: "/billing",
        icon: Receipt,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT", "RECEPTIONIST"]
      },
      {
        title: "Accounts Receivable",
        href: "/accounts-receivable",
        icon: CircleDollarSign,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT"]
      },
      {
        title: "Expense Management",
        href: "/expenses",
        icon: CircleDollarSign,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT"]
      },
      {
        title: "Refund Management",
        href: "/refunds",
        icon: CircleDollarSign,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT"]
      },
      {
        title: "Payroll",
        href: "/payroll",
        icon: DollarSign,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT"]
      }
    ]
  },
  {
    id: "administration",
    title: "Administration",
    icon: Settings,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
    items: [
      {
        title: "Marketplace",
        href: "/marketplace",
        icon: ShoppingCart,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Website Integration",
        href: "/integration-settings",
        icon: Globe,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"],
        marketplaceAddOn: true
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Users & Permissions",
        href: "/users-and-permissions",
        icon: User,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Custom Fields",
        href: "/custom-fields",
        icon: ListFilter,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Trash",
        href: "/trash",
        icon: Trash2,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Communications",
        href: "/communications-unified",
        icon: Network,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Practice Admin",
        href: "/practice-admin",
        icon: Building2,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Practice Billing",
        href: "/practice-billing",
        icon: Building2,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Subscription Plans",
        href: "/subscriptions",
        icon: CircleDollarSign,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Payment Gateway",
        href: "/payment-gateway",
        icon: CreditCard,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"]
      },
      {
        title: "Audit Logs",
        href: "/audit-logs",
        icon: ShieldAlert,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Audit Reports",
        href: "/audit-reports",
        icon: BarChart3,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      }
    ]
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
    items: [
      {
        title: "Reports & Analytics",
        href: "/analytics-reporting",
        icon: BarChart3,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Advanced Reporting",
        href: "/advanced-reporting",
        icon: LineChart,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Predictive Analytics",
        href: "/predictive-analytics",
        icon: LineChart,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Audit Reports",
        href: "/audit-reports",
        icon: ShieldCheck,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      }
    ]
  },
  {
    id: "customization",
    title: "Customization",
    icon: AppWindow,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
    items: [
      {
        title: "Theme Customization",
        href: "/theme-customization",
        icon: AppWindow,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"]
      },
      {
        title: "Custom Fields",
        href: "/custom-fields",
        icon: FolderOpen,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Dashboard Config",
        href: "/dashboard-config",
        icon: LayoutDashboard,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Custom Field Demo",
        href: "/custom-field-demo",
        icon: ClipboardList,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      },
      {
        title: "Offline Demo",
        href: "/offline-demo",
        icon: Network,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"]
      }
    ]
  },
  {
    id: "help",
    title: "Help & Support",
    icon: BadgeHelp,
    roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT"],
    items: [
      {
        title: "FAQ",
        href: "#",
        icon: BadgeHelp,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT"]
      },
      {
        title: "Support",
        href: "#",
        icon: Users,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT"]
      }
    ]
  },
  {
    id: "superAdmin",
    title: "System Admin",
    icon: ShieldAlert,
    roles: ["ADMINISTRATOR"],
    items: [
      {
        title: "Super Admin",
        href: "/super-admin",
        icon: ShieldAlert,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "System Governance",
        href: "/system-governance",
        icon: Gauge,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Governance Audit",
        href: "/governance-audit",
        icon: ShieldCheck,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Onboarding",
        href: "/onboarding",
        icon: AppWindow,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Subscription Management",
        href: "/admin/subscription-management",
        icon: CreditCard,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Tenant Deployments",
        href: "/tenant-deployments",
        icon: Boxes,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Marketplace Management",
        href: "/admin/marketplace-management",
        icon: ShoppingCart,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Email Templates",
        href: "/admin/email-templates",
        icon: Mail,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Email Service",
        href: "/admin/email-service",
        icon: AtSign,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Onboarding Settings",
        href: "/admin/onboarding-settings",
        icon: Settings2,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Billing Management",
        href: "/admin/billing-management",
        icon: Receipt,
        roles: ["ADMINISTRATOR"]
      },
      {
        title: "Billing Analytics",
        href: "/admin/billing-analytics",
        icon: LineChart,
        roles: ["ADMINISTRATOR"]
      }
    ]
  }
];

export function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading: userIsLoading, initialAuthChecked } = useUser();
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = React.useState("");

  // --- Crucial Change: Transformed Nav Items Logic ---
  const transformedNavItems: NavItem[] = React.useMemo(() => {
    return menuGroups.map(group => {
      // If the group has 'items', it's a menu with a submenu
      if (group.items && group.items.length > 0) {
        return {
          title: group.title,
          icon: group.icon,
          keywords: group.keywords || [],
          roles: group.roles,
          submenu: group.items.map(item => ({
            title: item.title,
            href: item.href,
            icon: item.icon,
            keywords: item.keywords,
            roles: item.roles,
            isAddon: item.marketplaceAddOn,
            requiresWebsiteIntegration: item.title === "Website Requests" || item.title === "Website Integration"
          })),
        };
      } else {
        // If the group has no 'items' but has a 'href', it's a direct navigation link (like a dashboard)
        return {
          title: group.title,
          href: group.href,
          icon: group.icon,
          keywords: group.keywords || [],
          roles: group.roles,
        };
      }
    });
  }, []); // Depend on menuGroups if it changes, but here it's static

  // Rest of the component remains unchanged
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

    return transformedNavItems.filter(item => {
      const hasRole = item.roles.includes(user.role as AppUserRole);
      if (!hasRole) return false;

      if (!searchTerm) return true;

      const matchesTitle = item.title.toLowerCase().includes(lowerSearchTerm);
      const matchesKeywords = item.keywords?.some(k => k.toLowerCase().includes(lowerSearchTerm));

      const matchesSubmenu = item.submenu?.some(sub =>
        (sub.roles ? sub.roles.includes(user.role as AppUserRole) : true) &&
        (sub.title.toLowerCase().includes(lowerSearchTerm) ||
          (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm))))
      );

      return matchesTitle || matchesKeywords || matchesSubmenu;
    }).map(item => {
      if (searchTerm && item.submenu) {
        const filteredSubmenu = item.submenu.filter(sub =>
          (sub.roles ? sub.roles.includes(user.role as AppUserRole) : true) &&
          (sub.title.toLowerCase().includes(lowerSearchTerm) ||
            (sub.keywords && sub.keywords.some(sk => sk.toLowerCase().includes(lowerSearchTerm))))
        );

        if (filteredSubmenu.length > 0 || item.title.toLowerCase().includes(lowerSearchTerm) || (item.keywords && item.keywords.some(k => k.toLowerCase().includes(lowerSearchTerm)))) {
          return { ...item, submenu: filteredSubmenu.length > 0 ? filteredSubmenu : [] };
        }
        return null;
      }
      return item;
    }).filter(item => item !== null) as NavItem[];
  }, [user, userIsLoading, initialAuthChecked, transformedNavItems, searchTerm]);

  React.useEffect(() => {
    const newExpandedState: Record<string, boolean> = {};
    filteredNavItems.forEach(item => {
      if (item.submenu && item.submenu.length > 0) {
        const isParentActive = item.href && pathname.startsWith(item.href) && item.href !== '/';
        const isSubmenuActive = item.submenu.some(subItem => subItem.href && pathname.startsWith(subItem.href));

        if (isParentActive || isSubmenuActive || (searchTerm && item.submenu.length > 0 && (item.submenu.some(sub => sub.title.toLowerCase().includes(searchTerm.toLowerCase()))))) {
          newExpandedState[item.title] = true;
        }
      }
    });
    setExpandedMenus(prev => ({ ...prev, ...newExpandedState }));
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

  const renderNavItemContent = (item: NavItem | SubmenuItem, isSubmenuItem: boolean, currentViewCollapsed: boolean) => {
    const itemIcon = item.icon ? <item.icon className={cn("h-5 w-5", currentViewCollapsed && !isSubmenuItem ? "mx-auto" : "mr-3 shrink-0", isSubmenuItem && "h-4 w-4 mr-2")} /> : null;
    const titleText = <span className="truncate flex-1">{item.title}</span>;

    const addOnBadge = (item as NavItem).isAddon ? (
      <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5 h-fit bg-yellow-100 text-yellow-700 border-yellow-300 group-hover:bg-yellow-200">
        Add-on
      </Badge>
    ) : null;

    const websiteIntegrationBadge = (item as NavItem).requiresWebsiteIntegration ? (
      <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5 h-fit bg-blue-100 text-blue-700 border-blue-300 group-hover:bg-blue-200">
        Requires Integration
      </Badge>
    ) : null;

    if (currentViewCollapsed && !isSubmenuItem) {
      return itemIcon;
    }

    return (
      <>
        {itemIcon}
        {titleText}
        {!isSubmenuItem && 'submenu' in item && (item.submenu?.length ?? 0) > 0 && (
          expandedMenus[item.title] ? <ChevronUp className="h-4 w-4 ml-auto opacity-70 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-auto opacity-70 shrink-0" />
        )}
        {addOnBadge}
        {websiteIntegrationBadge && !addOnBadge && websiteIntegrationBadge}
      </>
    );
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

      const commonButtonClasses = cn(
        "flex items-center w-full text-sm font-medium rounded-md transition-colors duration-150",
        "group",
        isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
        currentViewCollapsed ? "justify-center py-3 px-0" : "px-3 py-2.5"
      );

      // This logic correctly distinguishes between a direct link and a toggleable menu item
      const buttonOrLink = item.href && (subItemsToShow.length === 0 || item.href === pathname) ? ( // If it's a direct link OR if it's a parent that is directly active
        <Link
          href={item.href}
          onClick={() => {
            if (item.onClick) item.onClick();
            setMobileSheetOpen(false);
          }}
          className={commonButtonClasses}
        >
          {renderNavItemContent(item, false, currentViewCollapsed)}
        </Link>
      ) : ( // Otherwise, it's a button to toggle a submenu (or a parent without a direct active link)
        <Button
          variant="ghost"
          onClick={() => {
            if (subItemsToShow.length > 0) {
              toggleMenu(item.title);
            } else if (item.href) {
              router.push(item.href);
              setMobileSheetOpen(false);
            } else if (item.onClick) {
              item.onClick();
              setMobileSheetOpen(false);
            }
          }}
          className={cn(commonButtonClasses, "justify-start text-left")}
          aria-expanded={subItemsToShow.length > 0 ? isMenuExpanded : undefined}
        >
          {renderNavItemContent(item, false, currentViewCollapsed)}
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
                  {(item as NavItem).isAddon && <Badge variant="outline" className="ml-1 text-xs px-1 py-0 bg-yellow-100 text-yellow-700 border-yellow-300">Add-on</Badge>}
                  {(item as NavItem).requiresWebsiteIntegration && <Badge variant="outline" className="ml-1 text-xs px-1 py-0 bg-blue-100 text-blue-700 border-blue-300">Needs Integration</Badge>}
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
                    key={subItem.title + subItem.href}
                    href={subItem.href}
                    onClick={() => setMobileSheetOpen(false)}
                    className={cn(
                      "flex items-center w-full text-xs font-medium rounded-md px-3 py-2 transition-colors duration-150",
                      "group",
                      isSubItemActive ? "text-primary" : "text-foreground/60 hover:text-primary hover:bg-primary/5"
                    )}
                  >
                    {renderNavItemContent(subItem, true, currentViewCollapsed)}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  }, [filteredNavItems, pathname, expandedMenus, user, toggleMenu, router]);

  const CollapseToggleButton = ({ forHeader = false }: { forHeader?: boolean }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-primary shrink-0",
              forHeader ? (isCollapsed ? "h-9 w-9" : "h-8 w-8 ml-auto") : (isCollapsed ? "h-9 w-9 mx-auto" : "h-8 w-8 ml-auto")
            )}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          <p>{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  const renderSidebarContent = ({ effectiveIsCollapsed }: { effectiveIsCollapsed: boolean }) => (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", effectiveIsCollapsed ? "" : "")}>
      <div className={cn(
        "flex h-16 items-center border-b border-border shrink-0",
        effectiveIsCollapsed ? "justify-center px-1 py-1" : "px-4 justify-between"
      )}>
        {!effectiveIsCollapsed && (
          <Link href="/" className="flex items-center gap-2 font-semibold mr-2" onClick={() => setMobileSheetOpen(false)}>
            <h1 className="text-xl">
              <span className="text-foreground">SmartDVM</span>
            </h1>
          </Link>
        )}
        <CollapseToggleButton forHeader={true} />
      </div>

      {!effectiveIsCollapsed && (
        <div className="p-3 border-b border-border">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search menu..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <nav className={cn(
        "flex-1 overflow-y-auto custom-scrollbar p-2 transition-all duration-150 ease-in-out",
        effectiveIsCollapsed ? "space-y-1" : "space-y-1.5"
      )}>
        {renderNavItems({ currentViewCollapsed: effectiveIsCollapsed })}
      </nav>

      <div className={cn(
        "mt-auto border-t border-border flex items-center p-3 transition-all duration-150 ease-in-out",
        effectiveIsCollapsed ? "justify-center" : "justify-between"
      )}>
        {user?.role && (
          <>
            {!effectiveIsCollapsed && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user.email || user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate max-w-[120px]">{user.name || user.email || "User"}</span>
                  <Badge variant="secondary" className="w-fit text-xs px-1 py-0">{user.role}</Badge>
                </div>
              </div>
            )}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={effectiveIsCollapsed ? "icon" : "sm"}
                    onClick={logout}
                    className={cn(
                      "text-muted-foreground hover:text-destructive",
                      effectiveIsCollapsed ? "h-9 w-9" : "h-8 px-2"
                    )}
                  >
                    <LogOut className={cn("h-5 w-5", !effectiveIsCollapsed && "mr-2")} />
                    {!effectiveIsCollapsed && <span className="sr-only sm:not-sr-only">Logout</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={effectiveIsCollapsed ? "right" : "top"} className={effectiveIsCollapsed ? "ml-2" : ""}>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
        {!user?.role && initialAuthChecked && (
          <Link href="/auth/login" className={cn(
            "flex items-center text-sm font-medium rounded-md transition-colors duration-150",
            "group text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            effectiveIsCollapsed ? "justify-center py-3 px-0 w-full" : "px-3 py-2.5 w-full"
          )}>
            <LogIn className={cn("h-5 w-5", effectiveIsCollapsed ? "mx-auto" : "mr-3 shrink-0")} />
            {!effectiveIsCollapsed && <span className="truncate flex-1">Login</span>}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {renderSidebarContent({ effectiveIsCollapsed: false })}
        </SheetContent>
      </Sheet>

      <aside className={cn(
        "hidden lg:flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 border-r border-border",
        isCollapsed ? "w-[72px]" : "w-64"
      )}>
        {renderSidebarContent({ effectiveIsCollapsed: isCollapsed })}
      </aside>
    </>
  );
}