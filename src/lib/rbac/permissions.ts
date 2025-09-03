/**
 * Permission Definitions and Resource Management
 */

import { 
  ResourceDefinition, 
  ActionDefinition, 
  ResourceCategory, 
  ResourceType, 
  StandardAction,
  PermissionTemplate
} from './types';

// Define all available actions for each resource type
const STANDARD_ACTIONS: ActionDefinition[] = [
  { name: StandardAction.CREATE, description: 'Create new records' },
  { name: StandardAction.READ, description: 'View existing records' },
  { name: StandardAction.UPDATE, description: 'Modify existing records' },
  { name: StandardAction.DELETE, description: 'Remove records' },
  { name: StandardAction.MANAGE, description: 'Full control over records' },
  { name: StandardAction.APPROVE, description: 'Approve pending items' },
  { name: StandardAction.REJECT, description: 'Reject pending items' },
  { name: StandardAction.ASSIGN, description: 'Assign to users/resources' },
  { name: StandardAction.UNASSIGN, description: 'Remove assignments' },
  { name: StandardAction.EXPORT, description: 'Export data' },
  { name: StandardAction.IMPORT, description: 'Import data' },
  { name: StandardAction.ARCHIVE, description: 'Archive records' },
  { name: StandardAction.RESTORE, description: 'Restore archived records' },
];

// Define resource-specific actions
const USER_MANAGEMENT_ACTIONS = [
  StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, 
  StandardAction.DELETE, StandardAction.MANAGE, StandardAction.ASSIGN, 
  StandardAction.UNASSIGN, StandardAction.ARCHIVE
];

const PATIENT_CARE_ACTIONS = [
  StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, 
  StandardAction.DELETE, StandardAction.MANAGE, StandardAction.ASSIGN,
  StandardAction.APPROVE, StandardAction.EXPORT
];

const FINANCIAL_ACTIONS = [
  StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, 
  StandardAction.DELETE, StandardAction.APPROVE, StandardAction.REJECT,
  StandardAction.EXPORT, StandardAction.IMPORT
];

const SYSTEM_ACTIONS = [
  StandardAction.READ, StandardAction.UPDATE, StandardAction.MANAGE,
  StandardAction.EXPORT, StandardAction.IMPORT, StandardAction.ARCHIVE,
  StandardAction.RESTORE
];

// Resource Definitions
export const RESOURCE_DEFINITIONS: Record<ResourceType, ResourceDefinition> = {
  // User Management
  [ResourceType.USER]: {
    name: 'Users',
    description: 'System users and their accounts',
    category: ResourceCategory.USER_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => USER_MANAGEMENT_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.ROLE]: {
    name: 'Roles',
    description: 'User roles and permissions',
    category: ResourceCategory.USER_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => USER_MANAGEMENT_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PERMISSION]: {
    name: 'Permissions',
    description: 'System permissions and access control',
    category: ResourceCategory.USER_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.UPDATE, StandardAction.MANAGE].includes(a.name as StandardAction))
  },
  [ResourceType.USER_SESSION]: {
    name: 'User Sessions',
    description: 'Active user sessions',
    category: ResourceCategory.USER_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.DELETE, StandardAction.MANAGE].includes(a.name as StandardAction))
  },

  // Patient Care
  [ResourceType.PATIENT]: {
    name: 'Patients',
    description: 'Pet owners and client information',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PET]: {
    name: 'Pets',
    description: 'Pet records and information',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.APPOINTMENT]: {
    name: 'Appointments',
    description: 'Appointment scheduling and management',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.MEDICAL_RECORD]: {
    name: 'Medical Records',
    description: 'Pet medical history and records',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.SOAP_NOTE]: {
    name: 'SOAP Notes',
    description: 'Subjective, Objective, Assessment, Plan notes',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PRESCRIPTION]: {
    name: 'Prescriptions',
    description: 'Medication prescriptions',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.TREATMENT]: {
    name: 'Treatments',
    description: 'Medical treatments and procedures',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.VACCINATION]: {
    name: 'Vaccinations',
    description: 'Vaccination records and schedules',
    category: ResourceCategory.PATIENT_CARE,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },

  // Practice Management
  [ResourceType.PRACTICE]: {
    name: 'Practice Settings',
    description: 'Practice configuration and settings',
    category: ResourceCategory.PRACTICE_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.UPDATE, StandardAction.MANAGE].includes(a.name as StandardAction))
  },
  [ResourceType.STAFF]: {
    name: 'Staff',
    description: 'Staff members and assignments',
    category: ResourceCategory.PRACTICE_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => USER_MANAGEMENT_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.SCHEDULE]: {
    name: 'Schedules',
    description: 'Staff and resource scheduling',
    category: ResourceCategory.PRACTICE_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.ROOM]: {
    name: 'Rooms',
    description: 'Examination and treatment rooms',
    category: ResourceCategory.PRACTICE_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, StandardAction.DELETE, StandardAction.ASSIGN].includes(a.name as StandardAction))
  },
  [ResourceType.EQUIPMENT]: {
    name: 'Equipment',
    description: 'Medical and practice equipment',
    category: ResourceCategory.PRACTICE_MANAGEMENT,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },

  // Financial
  [ResourceType.BILLING]: {
    name: 'Billing',
    description: 'Billing and payment processing',
    category: ResourceCategory.FINANCIAL,
    actions: STANDARD_ACTIONS.filter(a => FINANCIAL_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.INVOICE]: {
    name: 'Invoices',
    description: 'Invoice generation and management',
    category: ResourceCategory.FINANCIAL,
    actions: STANDARD_ACTIONS.filter(a => FINANCIAL_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PAYMENT]: {
    name: 'Payments',
    description: 'Payment processing and tracking',
    category: ResourceCategory.FINANCIAL,
    actions: STANDARD_ACTIONS.filter(a => FINANCIAL_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.INSURANCE]: {
    name: 'Insurance',
    description: 'Pet insurance claims and processing',
    category: ResourceCategory.FINANCIAL,
    actions: STANDARD_ACTIONS.filter(a => FINANCIAL_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PRICING]: {
    name: 'Pricing',
    description: 'Service and product pricing',
    category: ResourceCategory.FINANCIAL,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.UPDATE, StandardAction.MANAGE].includes(a.name as StandardAction))
  },

  // Inventory
  [ResourceType.INVENTORY]: {
    name: 'Inventory',
    description: 'Inventory management and tracking',
    category: ResourceCategory.INVENTORY,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PRODUCT]: {
    name: 'Products',
    description: 'Products and supplies',
    category: ResourceCategory.INVENTORY,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.SUPPLIER]: {
    name: 'Suppliers',
    description: 'Vendor and supplier management',
    category: ResourceCategory.INVENTORY,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.PURCHASE_ORDER]: {
    name: 'Purchase Orders',
    description: 'Purchase order management',
    category: ResourceCategory.INVENTORY,
    actions: STANDARD_ACTIONS.filter(a => FINANCIAL_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.STOCK_MOVEMENT]: {
    name: 'Stock Movements',
    description: 'Inventory movements and adjustments',
    category: ResourceCategory.INVENTORY,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.EXPORT].includes(a.name as StandardAction))
  },

  // Laboratory
  [ResourceType.LAB_ORDER]: {
    name: 'Lab Orders',
    description: 'Laboratory test orders',
    category: ResourceCategory.LABORATORY,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.LAB_RESULT]: {
    name: 'Lab Results',
    description: 'Laboratory test results',
    category: ResourceCategory.LABORATORY,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, StandardAction.EXPORT, StandardAction.APPROVE].includes(a.name as StandardAction))
  },
  [ResourceType.LAB_PROVIDER]: {
    name: 'Lab Providers',
    description: 'External laboratory providers',
    category: ResourceCategory.LABORATORY,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },

  // Medical Imaging
  [ResourceType.IMAGING_ORDER]: {
    name: 'Imaging Orders',
    description: 'Medical imaging orders',
    category: ResourceCategory.MEDICAL_IMAGING,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.IMAGING_RESULT]: {
    name: 'Imaging Results',
    description: 'Medical imaging results',
    category: ResourceCategory.MEDICAL_IMAGING,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, StandardAction.EXPORT, StandardAction.APPROVE].includes(a.name as StandardAction))
  },
  [ResourceType.IMAGING_EQUIPMENT]: {
    name: 'Imaging Equipment',
    description: 'Medical imaging equipment',
    category: ResourceCategory.MEDICAL_IMAGING,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },

  // Communication
  [ResourceType.MESSAGE]: {
    name: 'Messages',
    description: 'Internal messaging system',
    category: ResourceCategory.COMMUNICATION,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, StandardAction.DELETE].includes(a.name as StandardAction))
  },
  [ResourceType.NOTIFICATION]: {
    name: 'Notifications',
    description: 'System notifications',
    category: ResourceCategory.COMMUNICATION,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.UPDATE, StandardAction.DELETE].includes(a.name as StandardAction))
  },
  [ResourceType.EMAIL]: {
    name: 'Email',
    description: 'Email communications',
    category: ResourceCategory.COMMUNICATION,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.EXPORT].includes(a.name as StandardAction))
  },
  [ResourceType.SMS]: {
    name: 'SMS',
    description: 'SMS communications',
    category: ResourceCategory.COMMUNICATION,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.CREATE, StandardAction.READ, StandardAction.EXPORT].includes(a.name as StandardAction))
  },
  [ResourceType.REFERRAL]: {
    name: 'Referrals',
    description: 'Patient referrals to specialists',
    category: ResourceCategory.COMMUNICATION,
    actions: STANDARD_ACTIONS.filter(a => PATIENT_CARE_ACTIONS.includes(a.name as StandardAction))
  },

  // Reports
  [ResourceType.REPORT]: {
    name: 'Reports',
    description: 'System reports and analytics',
    category: ResourceCategory.REPORTS,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.CREATE, StandardAction.EXPORT].includes(a.name as StandardAction))
  },
  [ResourceType.ANALYTICS]: {
    name: 'Analytics',
    description: 'Business analytics and insights',
    category: ResourceCategory.REPORTS,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.EXPORT].includes(a.name as StandardAction))
  },
  [ResourceType.DASHBOARD]: {
    name: 'Dashboard',
    description: 'Dashboard configuration and access',
    category: ResourceCategory.REPORTS,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.UPDATE].includes(a.name as StandardAction))
  },

  // System
  [ResourceType.SYSTEM_SETTING]: {
    name: 'System Settings',
    description: 'System configuration and settings',
    category: ResourceCategory.SYSTEM,
    actions: STANDARD_ACTIONS.filter(a => SYSTEM_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.AUDIT_LOG]: {
    name: 'Audit Logs',
    description: 'System audit and activity logs',
    category: ResourceCategory.SYSTEM,
    actions: STANDARD_ACTIONS.filter(a => [StandardAction.READ, StandardAction.EXPORT].includes(a.name as StandardAction))
  },
  [ResourceType.BACKUP]: {
    name: 'Backups',
    description: 'Data backup and restore',
    category: ResourceCategory.SYSTEM,
    actions: STANDARD_ACTIONS.filter(a => SYSTEM_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.INTEGRATION]: {
    name: 'Integrations',
    description: 'Third-party integrations',
    category: ResourceCategory.SYSTEM,
    actions: STANDARD_ACTIONS.filter(a => SYSTEM_ACTIONS.includes(a.name as StandardAction))
  },
  [ResourceType.API_KEY]: {
    name: 'API Keys',
    description: 'API key management',
    category: ResourceCategory.SYSTEM,
    actions: STANDARD_ACTIONS.filter(a => USER_MANAGEMENT_ACTIONS.includes(a.name as StandardAction))
  },
};

// Permission Templates for quick role setup
export const PERMISSION_TEMPLATES: Record<string, PermissionTemplate> = {
  VETERINARIAN_BASIC: {
    name: 'Basic Veterinarian',
    description: 'Standard permissions for veterinarians',
    category: ResourceCategory.PATIENT_CARE,
    permissions: [
      // Patient Care - Full access
      { resource: ResourceType.PATIENT, action: StandardAction.READ, granted: true },
      { resource: ResourceType.PET, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.APPOINTMENT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.MEDICAL_RECORD, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.SOAP_NOTE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PRESCRIPTION, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.TREATMENT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.VACCINATION, action: StandardAction.MANAGE, granted: true },
      // Laboratory
      { resource: ResourceType.LAB_ORDER, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.LAB_RESULT, action: StandardAction.READ, granted: true },
      // Medical Imaging
      { resource: ResourceType.IMAGING_ORDER, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.IMAGING_RESULT, action: StandardAction.READ, granted: true },
      // Basic inventory read access
      { resource: ResourceType.INVENTORY, action: StandardAction.READ, granted: true },
      { resource: ResourceType.PRODUCT, action: StandardAction.READ, granted: true },
      // Communication
      { resource: ResourceType.MESSAGE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.NOTIFICATION, action: StandardAction.READ, granted: true },
      { resource: ResourceType.REFERRAL, action: StandardAction.MANAGE, granted: true },
    ]
  },

  TECHNICIAN_BASIC: {
    name: 'Basic Technician',
    description: 'Standard permissions for veterinary technicians',
    category: ResourceCategory.PATIENT_CARE,
    permissions: [
      // Patient Care - Limited access
      { resource: ResourceType.PATIENT, action: StandardAction.READ, granted: true },
      { resource: ResourceType.PET, action: StandardAction.READ, granted: true },
      { resource: ResourceType.APPOINTMENT, action: StandardAction.READ, granted: true },
      { resource: ResourceType.MEDICAL_RECORD, action: StandardAction.READ, granted: true },
      { resource: ResourceType.SOAP_NOTE, action: StandardAction.CREATE, granted: true },
      { resource: ResourceType.SOAP_NOTE, action: StandardAction.READ, granted: true },
      { resource: ResourceType.VACCINATION, action: StandardAction.UPDATE, granted: true },
      // Laboratory
      { resource: ResourceType.LAB_ORDER, action: StandardAction.CREATE, granted: true },
      { resource: ResourceType.LAB_RESULT, action: StandardAction.READ, granted: true },
      // Medical Imaging
      { resource: ResourceType.IMAGING_ORDER, action: StandardAction.CREATE, granted: true },
      // Inventory
      { resource: ResourceType.INVENTORY, action: StandardAction.READ, granted: true },
      { resource: ResourceType.STOCK_MOVEMENT, action: StandardAction.CREATE, granted: true },
      // Communication
      { resource: ResourceType.MESSAGE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.NOTIFICATION, action: StandardAction.READ, granted: true },
    ]
  },

  RECEPTIONIST_BASIC: {
    name: 'Basic Receptionist',
    description: 'Standard permissions for receptionists',
    category: ResourceCategory.PATIENT_CARE,
    permissions: [
      // Patient Management
      { resource: ResourceType.PATIENT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PET, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.APPOINTMENT, action: StandardAction.MANAGE, granted: true },
      // Limited medical record access
      { resource: ResourceType.MEDICAL_RECORD, action: StandardAction.READ, granted: true },
      // Billing and Financial
      { resource: ResourceType.BILLING, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.INVOICE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PAYMENT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.INSURANCE, action: StandardAction.MANAGE, granted: true },
      // Communication
      { resource: ResourceType.MESSAGE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.NOTIFICATION, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.EMAIL, action: StandardAction.CREATE, granted: true },
      { resource: ResourceType.SMS, action: StandardAction.CREATE, granted: true },
      // Basic inventory read
      { resource: ResourceType.INVENTORY, action: StandardAction.READ, granted: true },
    ]
  },

  PRACTICE_ADMIN_FULL: {
    name: 'Practice Administrator',
    description: 'Full practice management permissions',
    category: ResourceCategory.PRACTICE_MANAGEMENT,
    permissions: [
      // User Management (within practice)
      { resource: ResourceType.USER, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.ROLE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.STAFF, action: StandardAction.MANAGE, granted: true },
      // Practice Management
      { resource: ResourceType.PRACTICE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.SCHEDULE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.ROOM, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.EQUIPMENT, action: StandardAction.MANAGE, granted: true },
      // Full financial access
      { resource: ResourceType.BILLING, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.INVOICE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PAYMENT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.INSURANCE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PRICING, action: StandardAction.MANAGE, granted: true },
      // Inventory Management
      { resource: ResourceType.INVENTORY, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PRODUCT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.SUPPLIER, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.PURCHASE_ORDER, action: StandardAction.MANAGE, granted: true },
      // Reports and Analytics
      { resource: ResourceType.REPORT, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.ANALYTICS, action: StandardAction.READ, granted: true },
      { resource: ResourceType.DASHBOARD, action: StandardAction.UPDATE, granted: true },
      // Communication
      { resource: ResourceType.MESSAGE, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.NOTIFICATION, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.EMAIL, action: StandardAction.MANAGE, granted: true },
      { resource: ResourceType.SMS, action: StandardAction.MANAGE, granted: true },
    ]
  },

  SUPER_ADMIN_FULL: {
    name: 'Super Administrator',
    description: 'Complete system access',
    category: ResourceCategory.SYSTEM,
    permissions: Object.values(ResourceType).map(resource => ({
      resource,
      action: StandardAction.MANAGE,
      granted: true
    }))
  }
};

// Get all permissions for a specific category
export function getPermissionsByCategory(category: ResourceCategory) {
  return Object.values(RESOURCE_DEFINITIONS)
    .filter(resource => resource.category === category)
    .flatMap(resource => 
      resource.actions.map(action => ({
        resource: resource.name,
        action: action.name,
        description: `${action.description} for ${resource.name}`
      }))
    );
}

// Get all available actions for a resource
export function getResourceActions(resourceType: ResourceType): ActionDefinition[] {
  return RESOURCE_DEFINITIONS[resourceType]?.actions || [];
}

// Get resource definition
export function getResourceDefinition(resourceType: ResourceType): ResourceDefinition | undefined {
  return RESOURCE_DEFINITIONS[resourceType];
}
