/**
 * RBAC Types and Interfaces
 */

import { UserRoleEnum } from '@/db/schema';

// Core Permission Types
export interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

// Role Types
export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemDefined: boolean;
  isCustom: boolean;
  practiceId?: number;
  permissions: Permission[];
  inheritsFrom?: string[]; // Role inheritance
}

// Resource and Action Definitions
export interface ResourceDefinition {
  name: string;
  description: string;
  category: string;
  actions: ActionDefinition[];
}

export interface ActionDefinition {
  name: string;
  description: string;
  requiresOwnership?: boolean;
  adminOnly?: boolean;
}

// Permission Check Context
export interface PermissionContext {
  userId: string;
  userRole: string;
  practiceId?: number;
  resourceId?: string;
  resourceType: string;
  action: string;
  additionalContext?: Record<string, any>;
}

// Permission Check Result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  missingPermissions?: string[];
}

// User Permission Override
export interface UserPermissionOverride {
  id: string;
  userId: string;
  resource: string;
  action: string;
  granted: boolean;
  reason: string;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'expired' | 'revoked';
}

// Role Assignment
export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'revoked';
}

// RBAC Configuration
export interface RBACConfig {
  enableInheritance: boolean;
  enableOverrides: boolean;
  enableTempPermissions: boolean;
  enableAuditLogging: boolean;
  defaultRole: string;
  superAdminRole: string;
}

// Audit Log Entry
export interface PermissionAuditLog {
  id: string;
  userId: string;
  resource: string;
  action: string;
  allowed: boolean;
  reason: string;
  context: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Resource Categories for UI Organization
export enum ResourceCategory {
  USER_MANAGEMENT = 'User Management',
  PATIENT_CARE = 'Patient Care',
  PRACTICE_MANAGEMENT = 'Practice Management',
  FINANCIAL = 'Financial',
  INVENTORY = 'Inventory',
  REPORTS = 'Reports',
  SYSTEM = 'System Administration',
  COMMUNICATION = 'Communication',
  LABORATORY = 'Laboratory',
  MEDICAL_IMAGING = 'Medical Imaging',
}

// Standard Actions
export enum StandardAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE', // Full CRUD + special actions
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ASSIGN = 'ASSIGN',
  UNASSIGN = 'UNASSIGN',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
}

// Resource Types
export enum ResourceType {
  // User Management
  USER = 'users',
  ROLE = 'roles',
  PERMISSION = 'permissions',
  USER_SESSION = 'user_sessions',
  
  // Patient Care
  PATIENT = 'patients',
  PET = 'pets',
  APPOINTMENT = 'appointments',
  MEDICAL_RECORD = 'medical_records',
  SOAP_NOTE = 'soap_notes',
  PRESCRIPTION = 'prescriptions',
  TREATMENT = 'treatments',
  VACCINATION = 'vaccinations',
  
  // Practice Management
  PRACTICE = 'practice_settings',
  STAFF = 'staff',
  SCHEDULE = 'schedules',
  ROOM = 'rooms',
  EQUIPMENT = 'equipment',
  
  // Financial
  BILLING = 'billing',
  INVOICE = 'invoices',
  PAYMENT = 'payments',
  INSURANCE = 'insurance',
  PRICING = 'pricing',
  
  // Inventory
  INVENTORY = 'inventory',
  PRODUCT = 'products',
  SUPPLIER = 'suppliers',
  PURCHASE_ORDER = 'purchase_orders',
  STOCK_MOVEMENT = 'stock_movements',
  
  // Laboratory
  LAB_ORDER = 'lab_orders',
  LAB_RESULT = 'lab_results',
  LAB_PROVIDER = 'lab_providers',
  
  // Medical Imaging
  IMAGING_ORDER = 'imaging_orders',
  IMAGING_RESULT = 'imaging_results',
  IMAGING_EQUIPMENT = 'imaging_equipment',
  
  // Communication
  MESSAGE = 'messages',
  NOTIFICATION = 'notifications',
  EMAIL = 'emails',
  SMS = 'sms',
  REFERRAL = 'referrals',
  
  // Reports
  REPORT = 'reports',
  ANALYTICS = 'analytics',
  DASHBOARD = 'dashboard',
  
  // System
  SYSTEM_SETTING = 'system_settings',
  AUDIT_LOG = 'audit_logs',
  BACKUP = 'backups',
  INTEGRATION = 'integrations',
  API_KEY = 'api_keys',
}

// Permission Templates for quick role setup
export interface PermissionTemplate {
  name: string;
  description: string;
  category: ResourceCategory;
  permissions: Omit<Permission, 'id'>[];
}

// Frontend permission check props
export interface WithPermissionProps {
  children: React.ReactNode;
  resource: ResourceType;
  action: StandardAction;
  fallback?: React.ReactNode;
  practiceId?: number;
  resourceId?: string;
}

// Higher-order component props for permission wrapping
export interface RequirePermissionProps {
  resource: ResourceType;
  action: StandardAction;
  practiceId?: number;
  resourceId?: string;
  redirectTo?: string;
  showFallback?: boolean;
  fallbackComponent?: React.ComponentType;
}
