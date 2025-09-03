import { db } from '@/db';
import { roles } from '@/db/schemas/rolesSchema';
import { UserRoleEnum } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const SYSTEM_ROLES = [
  {
    name: UserRoleEnum.SUPER_ADMIN,
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions across all practices',
    isSystemDefined: true,
    permissions: [
      { id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'users_delete', resource: 'users', action: 'DELETE', granted: true, category: 'Users & Access' },
      { id: 'users_manage', resource: 'users', action: 'MANAGE', granted: true, category: 'Users & Access' },
      { id: 'roles_create', resource: 'roles', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'roles_read', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'roles_update', resource: 'roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'roles_delete', resource: 'roles', action: 'DELETE', granted: true, category: 'Users & Access' },
      { id: 'permissions_manage', resource: 'permissions', action: 'MANAGE', granted: true, category: 'Users & Access' },
      { id: 'practices_create', resource: 'practices', action: 'CREATE', granted: true, category: 'System Management' },
      { id: 'practices_read', resource: 'practices', action: 'READ', granted: true, category: 'System Management' },
      { id: 'practices_update', resource: 'practices', action: 'UPDATE', granted: true, category: 'System Management' },
      { id: 'practices_delete', resource: 'practices', action: 'DELETE', granted: true, category: 'System Management' },
    ]
  },
  {
    name: UserRoleEnum.PRACTICE_ADMINISTRATOR,
    displayName: 'Practice Administrator',
    description: 'Full practice-level administration with most permissions',
    isSystemDefined: true,
    permissions: [
      { id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'users_delete', resource: 'users', action: 'DELETE', granted: false, category: 'Users & Access' },
      { id: 'roles_read', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'custom_roles_create', resource: 'custom_roles', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'custom_roles_update', resource: 'custom_roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
      { id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
      { id: 'financial_reports', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
    ]
  },
  {
    name: UserRoleEnum.ADMINISTRATOR,
    displayName: 'Administrator',
    description: 'General administrator with broad access',
    isSystemDefined: true,
    permissions: [
      { id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'roles_read', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
      { id: 'inventory_read', resource: 'inventory', action: 'READ', granted: true, category: 'Operations' },
    ]
  },
  {
    name: UserRoleEnum.VETERINARIAN,
    displayName: 'Veterinarian',
    description: 'Licensed veterinarian with patient care and medical record access',
    isSystemDefined: true,
    permissions: [
      { id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_create', resource: 'medical_records', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_read', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_update', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'prescriptions_create', resource: 'prescriptions', action: 'CREATE', granted: true, category: 'Medical' },
      { id: 'prescriptions_update', resource: 'prescriptions', action: 'UPDATE', granted: true, category: 'Medical' },
      { id: 'lab_orders_create', resource: 'lab_orders', action: 'CREATE', granted: true, category: 'Medical' },
      { id: 'lab_results_read', resource: 'lab_results', action: 'READ', granted: true, category: 'Medical' },
      { id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_update', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
    ]
  },
  {
    name: UserRoleEnum.TECHNICIAN,
    displayName: 'Veterinary Technician',
    description: 'Licensed veterinary technician with limited patient care access',
    isSystemDefined: true,
    permissions: [
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_read', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_update', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'lab_orders_read', resource: 'lab_orders', action: 'READ', granted: true, category: 'Medical' },
      { id: 'lab_results_read', resource: 'lab_results', action: 'READ', granted: true, category: 'Medical' },
      { id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_update', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'inventory_read', resource: 'inventory', action: 'READ', granted: true, category: 'Operations' },
      { id: 'inventory_update', resource: 'inventory', action: 'UPDATE', granted: true, category: 'Operations' },
    ]
  },
  {
    name: UserRoleEnum.RECEPTIONIST,
    displayName: 'Receptionist',
    description: 'Front desk operations and appointment management',
    isSystemDefined: true,
    permissions: [
      { id: 'appointments_create', resource: 'appointments', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_update', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'clients_create', resource: 'clients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'clients_read', resource: 'clients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'clients_update', resource: 'clients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'financial_basic', resource: 'financial_basic', action: 'READ', granted: true, category: 'Financial' },
    ]
  },
  {
    name: UserRoleEnum.PRACTICE_MANAGER,
    displayName: 'Practice Manager',
    description: 'Practice management with administrative and operational oversight',
    isSystemDefined: true,
    permissions: [
      { id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
      { id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
      { id: 'financial_reports', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
      { id: 'staff_scheduling', resource: 'staff_scheduling', action: 'MANAGE', granted: true, category: 'Operations' },
    ]
  },
  {
    name: UserRoleEnum.PRACTICE_ADMIN,
    displayName: 'Practice Admin',
    description: 'Practice-level administrative access',
    isSystemDefined: true,
    permissions: [
      { id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'custom_roles_create', resource: 'custom_roles', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
      { id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
    ]
  },
  {
    name: UserRoleEnum.ACCOUNTANT,
    displayName: 'Accountant',
    description: 'Financial management and reporting access',
    isSystemDefined: true,
    permissions: [
      { id: 'financial_reports', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
      { id: 'financial_manage', resource: 'financial_manage', action: 'UPDATE', granted: true, category: 'Financial' },
      { id: 'invoices_create', resource: 'invoices', action: 'CREATE', granted: true, category: 'Financial' },
      { id: 'invoices_read', resource: 'invoices', action: 'READ', granted: true, category: 'Financial' },
      { id: 'invoices_update', resource: 'invoices', action: 'UPDATE', granted: true, category: 'Financial' },
      { id: 'payments_manage', resource: 'payments', action: 'MANAGE', granted: true, category: 'Financial' },
    ]
  },
  {
    name: UserRoleEnum.CASHIER,
    displayName: 'Cashier',
    description: 'Payment processing and basic financial operations',
    isSystemDefined: true,
    permissions: [
      { id: 'payments_process', resource: 'payments', action: 'CREATE', granted: true, category: 'Financial' },
      { id: 'invoices_read', resource: 'invoices', action: 'READ', granted: true, category: 'Financial' },
      { id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'clients_read', resource: 'clients', action: 'READ', granted: true, category: 'Patients & Records' },
    ]
  },
  {
    name: UserRoleEnum.OFFICE_MANAGER,
    displayName: 'Office Manager',
    description: 'Office operations and administrative coordination',
    isSystemDefined: true,
    permissions: [
      { id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
      { id: 'inventory_read', resource: 'inventory', action: 'READ', granted: true, category: 'Operations' },
      { id: 'staff_scheduling', resource: 'staff_scheduling', action: 'MANAGE', granted: true, category: 'Operations' },
      { id: 'office_operations', resource: 'office_operations', action: 'MANAGE', granted: true, category: 'Operations' },
    ]
  },
  {
    name: UserRoleEnum.CLIENT,
    displayName: 'Client',
    description: 'Pet owner with limited access to their own records',
    isSystemDefined: true,
    permissions: [
      { id: 'own_pets_read', resource: 'own_pets', action: 'READ', granted: true, category: 'Personal Records' },
      { id: 'own_appointments_read', resource: 'own_appointments', action: 'READ', granted: true, category: 'Personal Records' },
      { id: 'own_appointments_create', resource: 'own_appointments', action: 'CREATE', granted: true, category: 'Personal Records' },
      { id: 'own_medical_records_read', resource: 'own_medical_records', action: 'READ', granted: true, category: 'Personal Records' },
      { id: 'profile_update', resource: 'profile', action: 'UPDATE', granted: true, category: 'Personal Records' },
    ]
  }
];

export async function seedSystemRoles() {
  console.log('Seeding system roles...');
  
  for (const roleData of SYSTEM_ROLES) {
    // Check if role already exists
    const existingRole = await db
      .select()
      .from(roles)
      .where(and(
        eq(roles.name, roleData.name),
        eq(roles.isSystemDefined, true)
      ))
      .limit(1);

    if (existingRole.length === 0) {
      await db.insert(roles).values({
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        isSystemDefined: roleData.isSystemDefined,
        permissions: roleData.permissions,
        practiceId: null, // System roles are not practice-specific
      });
      console.log(`✓ Created system role: ${roleData.displayName}`);
    } else {
      console.log(`- System role already exists: ${roleData.displayName}`);
    }
  }
  
  console.log('System roles seeding completed');
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedSystemRoles()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
