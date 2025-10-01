"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useRoles } from "@/hooks/use-roles";

// --- Type Definitions ---
type AppUserRole =
  | "SUPER_ADMIN"
  | "ADMINISTRATOR"
  | "PRACTICE_ADMINISTRATOR"
  | "CLIENT"
  | "PRACTICE_ADMIN"
  | "PRACTICE_MANAGER"
  | "VETERINARIAN"
  | "TECHNICIAN"
  | "RECEPTIONIST"
  | "ACCOUNTANT"
  | "CASHIER"
  | "OFFICE_MANAGER";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: AppUserRole[];
  keywords?: string[];
  marketplaceAddOn?: boolean;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  roles: AppUserRole[];
  href?: string;
  items?: MenuItem[];
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

// --- Menu data ---
const menuGroups: MenuGroup[] = [
  {
    id: "admin-dashboard",
    title: "Admin Dashboard",
    href: "/administrator",
    icon: LayoutDashboard,
    keywords: ["home", "main", "overview", "admin panel"],
    roles: ["SUPER_ADMIN", "ADMINISTRATOR"],
  },
  // {
  //   id: "practice-admin-dashboard",
  //   title: "Practice Admin Dashboard",
  //   href: "/practice-administrator",
  //   icon: LayoutDashboard,
  //   keywords: ["home", "main", "overview", "practice admin panel"],
  //   roles: ["PRACTICE_ADMINISTRATOR", "PRACTICE_ADMIN"],
  // },
  // {
  //   id: "client-dashboard",
  //   title: "Client Dashboard",
  //   href: "/client",
  //   icon: LayoutDashboard,
  //   keywords: ["home", "main", "overview", "my pets"],
  //   roles: ['CLIENT']
  // },
  // {
  //   id: "client-settings",
  //   title: "Client Settings",
  //   href: "/client-settings",
  //   icon: Settings,
  //   keywords: ["options", "configuration", "preferences", "profile", "account"],
  //   roles: ['CLIENT'],
  // },
  {
    id: "appointments",
    title: "Appointments",
    icon: Calendar,
    roles: [
      "SUPER_ADMIN",
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "VETERINARIAN",
      "TECHNICIAN",
      "RECEPTIONIST",
    ],
    items: [
      {
        title: "Appointments",
        href: "/admin/appointments",
        icon: Calendar,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Appointment Requests",
        href: "/admin/appointment-requests",
        icon: ClipboardCheck,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "RECEPTIONIST",
        ],
        // marketplaceAddOn: true,
      },
      {
        title: "Telemedicine",
        href: "/admin/telemedicine",
        icon: VideoIcon,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
        marketplaceAddOn: true,
      },
    ],
  },
  {
    id: "patients",
    title: "Patient Care",
    icon: Users,
    roles: [
      "SUPER_ADMIN",
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "VETERINARIAN",
      "TECHNICIAN",
      "RECEPTIONIST",
    ],
    items: [
      {
        title: "Clients & Pets",
        href: "/admin/clients",
        icon: Users,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Contact Requests",
        href: "/admin/contact-requests",
        icon: Mail,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Pet Admissions",
        href: "/admin/pet-admissions",
        icon: Building2,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Health Plans",
        href: "/admin/health-plans",
        icon: Heart,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Health Resources",
        href: "/admin/health-resources",
        icon: FileEdit,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
        ],
      },
      {
        title: "Vaccinations",
        href: "/admin/vaccinations",
        icon: Pill,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
    ],
  },
  {
    id: "medicalRecords",
    title: "Medical Records",
    icon: FileEdit,
    roles: [
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "VETERINARIAN",
      "TECHNICIAN",
    ],
    items: [
      {
        title: "SOAP Notes",
        href: "/admin/soap-notes",
        icon: FileEdit,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Patient Timeline",
        href: "/admin/patient-timeline",
        icon: ClipboardList,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Whiteboard",
        href: "/admin/whiteboard",
        icon: Tablet,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Checklists",
        href: "/admin/checklists",
        icon: ClipboardList,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
    ],
  },
  {
    id: "clinicalTools",
    title: "Clinical Tools",
    icon: Stethoscope,
    roles: [
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "VETERINARIAN",
      "TECHNICIAN",
    ],
    items: [
      {
        title: "Lab Integration",
        href: "/admin/lab-integration",
        icon: Microscope,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Medical Imaging",
        href: "/admin/medical-imaging",
        icon: FlaskConical,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Disease Reporting",
        href: "/admin/disease-reporting",
        icon: AlertTriangle,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
        ],
        marketplaceAddOn: true,
      },
      {
        title: "AI Diagnostic Assistant",
        href: "/admin/ai-diagnostic-assistant",
        icon: CircuitBoard,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
        ],
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory & Services",
    icon: Package,
    roles: [
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "VETERINARIAN",
      "TECHNICIAN",
      "RECEPTIONIST",
      "ACCOUNTANT",
      "CASHIER",
      "OFFICE_MANAGER",
    ],
    items: [
      {
        title: "Inventory",
        href: "/admin/inventory",
        icon: Package,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
        ],
      },
      {
        title: "Boarding",
        href: "/admin/boarding",
        icon: Warehouse,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Point of Sale",
        href: "/admin/pos",
        icon: CreditCard,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "ACCOUNTANT",
          "RECEPTIONIST",
          "CASHIER",
          "OFFICE_MANAGER",
        ],
        marketplaceAddOn: true,
      },
      {
        title: "Referrals",
        href: "/admin/referrals",
        icon: Trophy,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
        ],
      },
    ],
  },
  {
    id: "financial",
    title: "Financial",
    icon: CreditCard,
    roles: [
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "ACCOUNTANT",
      "RECEPTIONIST",
    ],
    items: [
      {
        title: "Client Billing",
        href: "/billing",
        icon: Receipt,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "ACCOUNTANT",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Accounts Receivable",
        href: "/accounts-receivable",
        icon: CircleDollarSign,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "ACCOUNTANT",
        ],
      },
      {
        title: "Expense Management",
        href: "/expenses",
        icon: CircleDollarSign,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "ACCOUNTANT",
        ],
      },
      {
        title: "Refund Management",
        href: "/refunds",
        icon: CircleDollarSign,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "ACCOUNTANT",
        ],
      },
      {
        title: "Payroll",
        href: "/payroll",
        icon: DollarSign,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "ACCOUNTANT",
        ],
      },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    icon: Settings,
    roles: [
      "SUPER_ADMIN",
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
    ],
    items: [
      {
        title: "Marketplace",
        href: "/marketplace",
        icon: ShoppingCart,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Website Integration",
        href: "/admin/integration-settings",
        icon: Globe,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
        marketplaceAddOn: true,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
        ],
      },
      {
        title: "Users & Permissions",
        href: "/admin/users-and-permissions",
        icon: User,
        // Include both legacy and canonical practice admin role names so the link appears for either
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_ADMINISTRATOR",
        ],
      },
      {
        title: "Custom Fields",
        href: "/custom-fields",
        icon: ListFilter,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Trash",
        href: "/trash",
        icon: Trash2,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Communications",
        href: "/communications-unified",
        icon: Network,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
        ],
      },
      {
        title: "Practice Admin",
        href: "/practice-admin",
        icon: Building2,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Practice Billing",
        href: "/practice-billing",
        icon: Building2,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Subscription Plans",
        href: "/subscriptions",
        icon: CircleDollarSign,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Payment Gateway",
        href: "/payment-gateway",
        icon: CreditCard,
        roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        roles: [
          "SUPER_ADMIN",
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
        ],
      },
      {
        title: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ShieldAlert,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Audit Reports",
        href: "/admin/audit-reports",
        icon: BarChart3,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
    ],
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
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
      {
        title: "Advanced Reporting",
        href: "/advanced-reporting",
        icon: LineChart,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
      {
        title: "Predictive Analytics",
        href: "/predictive-analytics",
        icon: LineChart,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
      {
        title: "Audit Reports",
        href: "/audit-reports",
        icon: ShieldCheck,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
    ],
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
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN"],
      },
      {
        title: "Custom Fields",
        href: "/custom-fields",
        icon: FolderOpen,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
      {
        title: "Dashboard Config",
        href: "/dashboard-config",
        icon: LayoutDashboard,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
      {
        title: "Custom Field Demo",
        href: "/custom-field-demo",
        icon: ClipboardList,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
      {
        title: "Offline Demo",
        href: "/offline-demo",
        icon: Network,
        roles: ["ADMINISTRATOR", "PRACTICE_ADMIN", "PRACTICE_MANAGER"],
      },
    ],
  },
  {
    id: "help",
    title: "Help & Support",
    icon: BadgeHelp,
    roles: [
      "ADMINISTRATOR",
      "PRACTICE_ADMIN",
      "PRACTICE_MANAGER",
      "VETERINARIAN",
      "TECHNICIAN",
      "RECEPTIONIST",
      "ACCOUNTANT",
    ],
    items: [
      {
        title: "FAQ",
        href: "#",
        icon: BadgeHelp,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
          "ACCOUNTANT",
        ],
      },
      {
        title: "Support",
        href: "#",
        icon: Users,
        roles: [
          "ADMINISTRATOR",
          "PRACTICE_ADMIN",
          "PRACTICE_MANAGER",
          "VETERINARIAN",
          "TECHNICIAN",
          "RECEPTIONIST",
          "ACCOUNTANT",
        ],
      },
    ],
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
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "System Governance",
        href: "/system-governance",
        icon: Gauge,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Governance Audit",
        href: "/governance-audit",
        icon: ShieldCheck,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Onboarding",
        href: "/onboarding",
        icon: AppWindow,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Subscription Management",
        href: "/admin/subscription-management",
        icon: CreditCard,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Tenant Deployments",
        href: "/tenant-deployments",
        icon: Boxes,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Marketplace Management",
        href: "/admin/marketplace",
        icon: ShoppingCart,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Email Templates",
        href: "/admin/email-templates",
        icon: Mail,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Email Service",
        href: "/admin/email-service",
        icon: AtSign,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Onboarding Settings",
        href: "/admin/onboarding-settings",
        icon: Settings2,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Billing Management",
        href: "/admin/billing-management",
        icon: Receipt,
        roles: ["ADMINISTRATOR"],
      },
      {
        title: "Billing Analytics",
        href: "/admin/billing-analytics",
        icon: LineChart,
        roles: ["ADMINISTRATOR"],
      },
    ],
  },
];

// Mapping of sidebar features to marketplace add-on slugs (moved outside component)
const MARKETPLACE_FEATURE_MAPPING: Record<string, string> = {
  "Website Requests": "client-portal-mobile-app", // Maps to Client Portal Mobile App
  Telemedicine: "enhanced-communication-suite", // Maps to Enhanced Communication Suite
  "Disease Reporting": "ai-powered-diagnosis-assistant", // Maps to AI-Powered Diagnosis Assistant
  "Point of Sale": "financial-management-pro", // Maps to Financial Management Pro
  "Website Integration": "client-portal-mobile-app", // Maps to Client Portal Mobile App
};

export function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    logout,
    isLoading: userIsLoading,
    initialAuthChecked,
    userPracticeId,
  } = useUser();
  // Role helpers that understand assigned roles (from user.roles) as well as legacy user.role
  const practiceIdNumber = Number(userPracticeId || 0) || 0;
  const { isSuperAdminAssigned, isPracticeAdminAssigned } =
    useRoles(practiceIdNumber);
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<
    Record<string, boolean>
  >({});
  const [searchTerm, setSearchTerm] = React.useState("");

  // Fetch practice add-ons (user's subscriptions) to check marketplace access
  const { data: practiceAddons } = useQuery({
    queryKey: ["/api/marketplace/practice"],
    queryFn: async () => {
      const response = await fetch("/api/marketplace/practice");
      if (!response.ok)
        throw new Error("Failed to fetch practice subscriptions");
      return response.json();
    },
    enabled: !!user && !!userPracticeId,
    refetchOnWindowFocus: false,
  });

  // Helper to check if practice has subscribed to a specific add-on
  const hasMarketplaceSubscription = React.useCallback(
    (featureTitle: string): boolean => {
      // Super admins and administrators get full access. Support both legacy `user.role` and
      // assigned roles returned on the user object (`user.roles`).
      const userHasRole = (roleName: string) => {
        if (!user) return false;
        if ((user as any).role === roleName) return true;
        const assigned = (user as any).roles;
        if (!Array.isArray(assigned)) return false;
        return assigned.some((r: any) => {
          const name = (r?.name || "").toString().toUpperCase();
          const display = (r?.displayName || "").toString().toUpperCase();
          return (
            name === roleName ||
            display === roleName ||
            name === roleName.replace(/_/g, "") ||
            display === roleName.replace(/_/g, "")
          );
        });
      };

      if (userHasRole("SUPER_ADMIN") || userHasRole("ADMINISTRATOR"))
        return true;

      const addOnSlug = MARKETPLACE_FEATURE_MAPPING[featureTitle];
      if (!addOnSlug || !practiceAddons) {
        return false;
      }

      const hasActiveSubscription = (
        Array.isArray(practiceAddons) ? practiceAddons : []
      ).some((subscription: any) => {
        const addonMatches =
          subscription.addOn &&
          (subscription.addOn.slug === addOnSlug ||
            subscription.addOn.name
              .toLowerCase()
              .includes(featureTitle.toLowerCase()));
        return addonMatches && subscription.isActive;
      });

      return hasActiveSubscription;
    },
    [user, practiceAddons]
  );
  // Update dependency to trigger when the user or assigned roles change

  // Transform the menuGroups into the NavItem structure
  const allNavItems: NavItem[] = React.useMemo(() => {
    const clientSpecificItems: NavItem[] = [
      // {
      //   title: "Dashboard",
      //   href: "/client",
      //   icon: LayoutDashboard,
      //   keywords: ["home", "main", "overview"],
      //   roles: ['CLIENT']
      // },
      // {
      //   title: "Favorites",
      //   href: "/favorites",
      //   icon: Heart,
      //   keywords: ["saved", "bookmarked", "liked", "pets"],
      //   roles: ['CLIENT']
      // },
      // {
      //   title: "Symptom Checker",
      //   href: "/symptom-checker",
      //   icon: Sparkles,
      //   keywords: ["ai", "diagnosis", "assessment", "pet health", "check"],
      //   roles: ['CLIENT']
      // },
      // {
      //   title: "Vet Services",
      //   href: "/vet-services",
      //   icon: ClipboardList,
      //   keywords: ["offerings", "treatments", "procedures", "vet", "clinics", "hospitals"],
      //   roles: ['CLIENT']
      // },
      // {
      //   title: "Settings",
      //   href: "/settings",
      //   icon: Settings,
      //   keywords: ["options", "configuration", "preferences", "profile", "account"],
      //   roles: ['CLIENT'],
      // },
    ];

    const processedGroups: NavItem[] = menuGroups.map((group) => ({
      title: group.title,
      icon: group.icon,
      // A group title itself doesn't have a direct href unless explicitly defined (like dashboards)
      // If href is not defined, it implies it's a parent of submenus
      href: group.href,
      keywords: group.keywords, // Use group's own keywords first
      roles: group.roles, // Use group's roles first
      submenu: group.items
        ?.filter((item) => {
          // Filter out marketplace add-ons that user doesn't have access to
          if (item.marketplaceAddOn) {
            return hasMarketplaceSubscription(item.title);
          }
          return true;
        })
        .map((item) => ({
          title: item.title,
          href: item.href,
          icon: item.icon,
          keywords: item.keywords,
          roles: item.roles,
          isAddon: item.marketplaceAddOn,
          requiresWebsiteIntegration:
            item.title === "Website Requests" ||
            item.title === "Website Integration",
        })),
    }));

    // Combine client-specific items with the transformed menu groups.
    // Ensure that items appear only once if there are overlaps.
    const combinedItems: NavItem[] = [...clientSpecificItems];

    processedGroups.forEach((group) => {
      // Avoid adding duplicate top-level items if a client-specific item already covers it
      if (
        !combinedItems.some(
          (item) => item.title === group.title && item.href === group.href
        )
      ) {
        combinedItems.push(group);
      }
    });

    return combinedItems;
  }, [practiceAddons, user?.role, hasMarketplaceSubscription]);

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

    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    const userAssignedRoles = (user as any)?.roles;
    const userLegacyRole = (user as any)?.role;

    const userHasAnyRole = (allowedRoles: AppUserRole[] | undefined) => {
      if (!allowedRoles || allowedRoles.length === 0) return false;

      // SUPER_ADMIN has access to everything
      if (
        userLegacyRole === "SUPER_ADMIN" ||
        (Array.isArray(userAssignedRoles) &&
          userAssignedRoles.some(
            (r: any) =>
              (r?.name || "").toString().toUpperCase() === "SUPER_ADMIN" ||
              (r?.displayName || "").toString().toUpperCase() === "SUPER_ADMIN"
          ))
      ) {
        return true;
      }

      // Check legacy role first
      if (
        userLegacyRole &&
        allowedRoles.includes(userLegacyRole as AppUserRole)
      )
        return true;
      // Check assigned roles array
      if (!Array.isArray(userAssignedRoles)) return false;
      return allowedRoles.some((ar) =>
        userAssignedRoles.some((r: any) => {
          const name = (r?.name || "").toString().toUpperCase();
          const display = (r?.displayName || "").toString().toUpperCase();
          return (
            name === ar ||
            display === ar ||
            name === ar.replace(/_/g, "") ||
            display === ar.replace(/_/g, "")
          );
        })
      );
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
        // Filter submenus for matches
        const matchingSubmenuItems = item.submenu.filter((sub) => {
          const hasRoleForSub = sub.roles ? userHasAnyRole(sub.roles) : true;
          return (
            hasRoleForSub &&
            (sub.title.toLowerCase().includes(lowerSearchTerm) ||
              (sub.keywords &&
                sub.keywords.some((sk) =>
                  sk.toLowerCase().includes(lowerSearchTerm)
                )))
          );
        });

        if (parentMatches && matchingSubmenuItems.length === 0) {
          // If parent matches but no submenu items match, show parent without submenu
          // This handles cases where only the group title/keywords are searched.
          results.push({ ...item, submenu: [] });
        } else if (matchingSubmenuItems.length > 0) {
          // If any submenu item matches, show the parent with only matching submenu items
          // This ensures the group is shown only when a specific item within it matches.
          results.push({ ...item, submenu: matchingSubmenuItems });
        }
      } else if (parentMatches) {
        // If it's a direct link (no submenu) and it matches, add it
        results.push(item);
      }
    });

    return results;
  }, [user, userIsLoading, initialAuthChecked, allNavItems, searchTerm]);

  React.useEffect(() => {
    const newExpandedState: Record<string, boolean> = {};
    filteredNavItems.forEach((item) => {
      if (item.submenu && item.submenu.length > 0) {
        const isParentActive = item.href
          ? item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
          : false;
        const isSubmenuActive = item.submenu.some(
          (subItem) => subItem.href && pathname.startsWith(subItem.href)
        );

        // Expand if active based on pathname, or if it was previously expanded by user
        if (isParentActive || isSubmenuActive || expandedMenus[item.title]) {
          newExpandedState[item.title] = true;
        }
      }
    });
    // Merge the new state with any existing manual expansions that weren't overridden by active path
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
    if (!emailOrName) return "U";
    const name = (user as AppUserType)?.name;
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
          currentViewCollapsed && !isSubmenuItem ? "mx-auto" : "mr-3 shrink-0",
          isSubmenuItem && "h-4 w-4 mr-2"
        )}
      />
    ) : null;
    const titleText = <span className="truncate flex-1">{item.title}</span>;

    const addOnBadge = (item as NavItem).isAddon ? (
      <Badge
        variant="outline"
        className="ml-auto text-xs px-1.5 py-0.5 h-fit bg-yellow-100 text-yellow-700 border-yellow-300 group-hover:bg-yellow-200"
      >
        Add-on
      </Badge>
    ) : null;

    const websiteIntegrationBadge = (item as NavItem)
      .requiresWebsiteIntegration ? (
      <Badge
        variant="outline"
        className="ml-auto text-xs px-1.5 py-0.5 h-fit bg-blue-100 text-blue-700 border-blue-300 group-hover:bg-blue-200"
      >
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
        {!isSubmenuItem &&
          "submenu" in item &&
          (item.submenu?.length ?? 0) > 0 &&
          (expandedMenus[item.title] ? (
            <ChevronUp className="h-4 w-4 ml-auto opacity-70 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-auto opacity-70 shrink-0" />
          ))}
        {addOnBadge}
        {websiteIntegrationBadge && !addOnBadge && websiteIntegrationBadge}
      </>
    );
  };

  const renderNavItems = React.useCallback(
    ({ currentViewCollapsed }: { currentViewCollapsed: boolean }) => {
      return filteredNavItems.map((item) => {
        // filteredNavItems already handles role-based filtering and search logic.
        // So, subItemsToShow is simply what's in item.submenu after filtering.
        const subItemsToShow = item.submenu || [];

        let isActive = item.href
          ? item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
          : false;
        if (!isActive && subItemsToShow.length > 0) {
          isActive = subItemsToShow.some(
            (subItem) => subItem.href && pathname.startsWith(subItem.href)
          );
        }

        // If there's a search term and this item has filtered submenus,
        // or if the item itself is a direct match and has no submenu,
        // ensure it's displayed.
        const isMenuExpanded =
          (searchTerm && subItemsToShow.length > 0) ||
          expandedMenus[item.title] ||
          false;

        const commonButtonClasses = cn(
          "flex items-center w-full text-sm font-medium rounded-md transition-colors duration-150",
          "group",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
          currentViewCollapsed ? "justify-center py-3 px-0" : "px-3 py-2.5"
        );

        const buttonOrLink =
          item.href && subItemsToShow.length === 0 ? (
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
          ) : (
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
              aria-expanded={
                subItemsToShow.length > 0 ? isMenuExpanded : undefined
              }
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
                    {(item as NavItem).isAddon && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-xs px-1 py-0 bg-yellow-100 text-yellow-700 border-yellow-300"
                      >
                        Add-on
                      </Badge>
                    )}
                    {(item as NavItem).requiresWebsiteIntegration && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-xs px-1 py-0 bg-blue-100 text-blue-700 border-blue-300"
                      >
                        Needs Integration
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              buttonOrLink
            )}

            {/* Only render submenu if not collapsed, has sub-items, AND is expanded (either manually or by search) */}
            {!currentViewCollapsed &&
              subItemsToShow.length > 0 &&
              isMenuExpanded && (
                <div className="mt-1 space-y-1 pl-8 pr-2 py-1 border-l border-border/50 ml-[1.125rem] mr-1">
                  {subItemsToShow.map((subItem) => {
                    const isSubItemActive =
                      subItem.href && pathname.startsWith(subItem.href);
                    return (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        onClick={() => setMobileSheetOpen(false)}
                        className={cn(
                          "flex items-center w-full text-sm rounded-md transition-colors duration-150",
                          "group",
                          isSubItemActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                          "px-3 py-2"
                        )}
                      >
                        {renderNavItemContent(
                          subItem,
                          true,
                          currentViewCollapsed
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
          </div>
        );
      });
    },
    [
      filteredNavItems,
      pathname,
      toggleMenu,
      expandedMenus,
      user?.role,
      router,
      searchTerm,
    ]
  ); // Add searchTerm to deps

  const sidebarContent = (currentViewCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center p-4",
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
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="p-4">
        {!currentViewCollapsed && (
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <ul
          className={cn(
            "space-y-1",
            currentViewCollapsed ? "items-center" : ""
          )}
        >
          {renderNavItems({ currentViewCollapsed })}
        </ul>
      </nav>

      <div
        className={cn(
          "p-4 border-t border-border flex",
          currentViewCollapsed
            ? "justify-center"
            : "justify-between items-center"
        )}
      >
        {user ? (
          <>
            {!currentViewCollapsed && (
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {getInitials(user.email || user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm truncate max-w-[120px]">
                    {user.name || user.email}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {user.role?.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            )}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={currentViewCollapsed ? "icon" : "sm"}
                    onClick={async () => {
                      await logout();
                      router.push("/auth/login");
                    }}
                    className={currentViewCollapsed ? "" : "ml-auto"}
                    aria-label="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                    {!currentViewCollapsed && (
                      <span className="ml-2">Logout</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {currentViewCollapsed && (
                  <TooltipContent side="right">Logout</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          !userIsLoading &&
          initialAuthChecked && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={currentViewCollapsed ? "icon" : "sm"}
                    onClick={() => router.push("/auth/login")}
                    className="w-full"
                    aria-label="Login"
                  >
                    <LogIn className="h-5 w-5" />
                    {!currentViewCollapsed && (
                      <span className="ml-2">Login</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {currentViewCollapsed && (
                  <TooltipContent side="right">Login</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
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
        <SheetTrigger asChild className="md:hidden p-4">
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 flex flex-col">
          {sidebarContent(false)}
        </SheetContent>
      </Sheet>
    </>
  );
}
