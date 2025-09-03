import { db } from '@/db';
import { roles } from '@/db/schema';
import { UserRoleEnum } from '@/lib/db-types';
import { eq } from 'drizzle-orm';

// Define system roles with their permissions
const systemRoles = [
  {
    name: UserRoleEnum.SUPER_ADMIN,
    displayName: 'Super Administrator',
    description: 'Full access to all system features and practices',
    permissions: [
      // Full permissions for all categories
      { id: 'users_CREATE', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'users_READ', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_UPDATE', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'users_DELETE', resource: 'users', action: 'DELETE', granted: true, category: 'Users & Access' },
      { id: 'users_MANAGE', resource: 'users', action: 'MANAGE', granted: true, category: 'Users & Access' },
      { id: 'roles_CREATE', resource: 'roles', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'roles_READ', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'roles_UPDATE', resource: 'roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'roles_DELETE', resource: 'roles', action: 'DELETE', granted: true, category: 'Users & Access' },
      { id: 'roles_MANAGE', resource: 'roles', action: 'MANAGE', granted: true, category: 'Users & Access' },
      { id: 'permissions_CREATE', resource: 'permissions', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'permissions_READ', resource: 'permissions', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'permissions_UPDATE', resource: 'permissions', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'permissions_DELETE', resource: 'permissions', action: 'DELETE', granted: true, category: 'Users & Access' },
      { id: 'permissions_MANAGE', resource: 'permissions', action: 'MANAGE', granted: true, category: 'Users & Access' },
      // Add more permissions as needed
    ]
  },
  {
    name: UserRoleEnum.PRACTICE_ADMINISTRATOR,
    displayName: 'Practice Administrator',
    description: 'Administrative access to practice management features',
    permissions: [
      { id: 'users_CREATE', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
      { id: 'users_READ', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'users_UPDATE', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
      { id: 'users_DELETE', resource: 'users', action: 'DELETE', granted: false, category: 'Users & Access' },
      { id: 'users_MANAGE', resource: 'users', action: 'MANAGE', granted: true, category: 'Users & Access' },
      { id: 'roles_READ', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
      { id: 'practice_settings_MANAGE', resource: 'practice_settings', action: 'MANAGE', granted: true, category: 'Practice Management' },
    ]
  },
  {
    name: UserRoleEnum.VETERINARIAN,
    displayName: 'Veterinarian',
    description: 'Full access to patient care and medical records',
    permissions: [
      { id: 'patients_CREATE', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_READ', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_UPDATE', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_CREATE', resource: 'medical_records', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_READ', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_UPDATE', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'treatments_CREATE', resource: 'treatments', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'treatments_READ', resource: 'treatments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'treatments_UPDATE', resource: 'treatments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
    ]
  },
  {
    name: UserRoleEnum.TECHNICIAN,
    displayName: 'Veterinary Technician',
    description: 'Access to patient care and lab functions',
    permissions: [
      { id: 'patients_READ', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_UPDATE', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_READ', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_UPDATE', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'lab_orders_CREATE', resource: 'lab_orders', action: 'CREATE', granted: true, category: 'Laboratory' },
      { id: 'lab_orders_READ', resource: 'lab_orders', action: 'READ', granted: true, category: 'Laboratory' },
      { id: 'lab_results_READ', resource: 'lab_results', action: 'READ', granted: true, category: 'Laboratory' },
      { id: 'lab_results_UPDATE', resource: 'lab_results', action: 'UPDATE', granted: true, category: 'Laboratory' },
    ]
  },
  {
    name: UserRoleEnum.RECEPTIONIST,
    displayName: 'Receptionist',
    description: 'Front desk operations and appointment management',
    permissions: [
      { id: 'patients_CREATE', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'patients_READ', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'patients_UPDATE', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'appointments_CREATE', resource: 'appointments', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'appointments_READ', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_UPDATE', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
      { id: 'billing_READ', resource: 'billing', action: 'READ', granted: true, category: 'Practice Management' },
      { id: 'billing_CREATE', resource: 'billing', action: 'CREATE', granted: true, category: 'Practice Management' },
    ]
  },
  {
    name: UserRoleEnum.CLIENT,
    displayName: 'Client',
    description: 'Limited access to own pet information',
    permissions: [
      { id: 'patients_READ', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_READ', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
      { id: 'appointments_CREATE', resource: 'appointments', action: 'CREATE', granted: true, category: 'Patients & Records' },
      { id: 'medical_records_READ', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
    ]
  }
];

async function seedSystemRoles() {
  console.log('🌱 Seeding system roles...');

  for (const roleData of systemRoles) {
    try {
      // Check if role already exists
      const existingRole = await db.select().from(roles).where(eq(roles.name, roleData.name));
      
      if (existingRole.length > 0) {
        console.log(`✅ System role "${roleData.displayName}" already exists, skipping...`);
        continue;
      }

      // Insert the role
      const [newRole] = await db.insert(roles).values({
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions,
        isSystemDefined: true,
        isActive: true,
        practiceId: null, // System roles are not tied to a specific practice
      }).returning();

      console.log(`✅ Created system role: ${roleData.displayName}`);
    } catch (error) {
      console.error(`❌ Failed to create role ${roleData.displayName}:`, error);
    }
  }

  console.log('🎉 System roles seeding completed!');
}

// Run the script
if (require.main === module) {
  seedSystemRoles()
    .then(() => {
      console.log('System roles seeded successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding system roles:', error);
      process.exit(1);
    });
}

export { seedSystemRoles };
