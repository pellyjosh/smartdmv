import { db } from '@/db';
import { roles } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Comprehensive permission set for SUPER_ADMIN
const SUPER_ADMIN_PERMISSIONS = [
  // Users & Access
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

  // Patients & Records
  { id: 'patients_CREATE', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
  { id: 'patients_READ', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
  { id: 'patients_UPDATE', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
  { id: 'patients_DELETE', resource: 'patients', action: 'DELETE', granted: true, category: 'Patients & Records' },
  { id: 'patients_MANAGE', resource: 'patients', action: 'MANAGE', granted: true, category: 'Patients & Records' },
  { id: 'medical_records_CREATE', resource: 'medical_records', action: 'CREATE', granted: true, category: 'Patients & Records' },
  { id: 'medical_records_READ', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
  { id: 'medical_records_UPDATE', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
  { id: 'medical_records_DELETE', resource: 'medical_records', action: 'DELETE', granted: true, category: 'Patients & Records' },
  { id: 'medical_records_MANAGE', resource: 'medical_records', action: 'MANAGE', granted: true, category: 'Patients & Records' },
  { id: 'appointments_CREATE', resource: 'appointments', action: 'CREATE', granted: true, category: 'Patients & Records' },
  { id: 'appointments_READ', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
  { id: 'appointments_UPDATE', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
  { id: 'appointments_DELETE', resource: 'appointments', action: 'DELETE', granted: true, category: 'Patients & Records' },
  { id: 'appointments_MANAGE', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },

  // Treatments & Procedures
  { id: 'treatments_CREATE', resource: 'treatments', action: 'CREATE', granted: true, category: 'Treatments & Procedures' },
  { id: 'treatments_READ', resource: 'treatments', action: 'READ', granted: true, category: 'Treatments & Procedures' },
  { id: 'treatments_UPDATE', resource: 'treatments', action: 'UPDATE', granted: true, category: 'Treatments & Procedures' },
  { id: 'treatments_DELETE', resource: 'treatments', action: 'DELETE', granted: true, category: 'Treatments & Procedures' },
  { id: 'treatments_MANAGE', resource: 'treatments', action: 'MANAGE', granted: true, category: 'Treatments & Procedures' },
  { id: 'procedures_CREATE', resource: 'procedures', action: 'CREATE', granted: true, category: 'Treatments & Procedures' },
  { id: 'procedures_READ', resource: 'procedures', action: 'READ', granted: true, category: 'Treatments & Procedures' },
  { id: 'procedures_UPDATE', resource: 'procedures', action: 'UPDATE', granted: true, category: 'Treatments & Procedures' },
  { id: 'procedures_DELETE', resource: 'procedures', action: 'DELETE', granted: true, category: 'Treatments & Procedures' },
  { id: 'procedures_MANAGE', resource: 'procedures', action: 'MANAGE', granted: true, category: 'Treatments & Procedures' },

  // Laboratory
  { id: 'lab_orders_CREATE', resource: 'lab_orders', action: 'CREATE', granted: true, category: 'Laboratory' },
  { id: 'lab_orders_READ', resource: 'lab_orders', action: 'READ', granted: true, category: 'Laboratory' },
  { id: 'lab_orders_UPDATE', resource: 'lab_orders', action: 'UPDATE', granted: true, category: 'Laboratory' },
  { id: 'lab_orders_DELETE', resource: 'lab_orders', action: 'DELETE', granted: true, category: 'Laboratory' },
  { id: 'lab_orders_MANAGE', resource: 'lab_orders', action: 'MANAGE', granted: true, category: 'Laboratory' },
  { id: 'lab_results_CREATE', resource: 'lab_results', action: 'CREATE', granted: true, category: 'Laboratory' },
  { id: 'lab_results_READ', resource: 'lab_results', action: 'READ', granted: true, category: 'Laboratory' },
  { id: 'lab_results_UPDATE', resource: 'lab_results', action: 'UPDATE', granted: true, category: 'Laboratory' },
  { id: 'lab_results_DELETE', resource: 'lab_results', action: 'DELETE', granted: true, category: 'Laboratory' },
  { id: 'lab_results_MANAGE', resource: 'lab_results', action: 'MANAGE', granted: true, category: 'Laboratory' },

  // Practice Management
  { id: 'practice_settings_CREATE', resource: 'practice_settings', action: 'CREATE', granted: true, category: 'Practice Management' },
  { id: 'practice_settings_READ', resource: 'practice_settings', action: 'READ', granted: true, category: 'Practice Management' },
  { id: 'practice_settings_UPDATE', resource: 'practice_settings', action: 'UPDATE', granted: true, category: 'Practice Management' },
  { id: 'practice_settings_DELETE', resource: 'practice_settings', action: 'DELETE', granted: true, category: 'Practice Management' },
  { id: 'practice_settings_MANAGE', resource: 'practice_settings', action: 'MANAGE', granted: true, category: 'Practice Management' },
  { id: 'practice_switching_MANAGE', resource: 'practice_switching', action: 'MANAGE', granted: true, category: 'Practice Management' },
  { id: 'practice_access_ALL', resource: 'practice_access', action: 'ALL', granted: true, category: 'Practice Management' },

  // Financial Management
  { id: 'billing_CREATE', resource: 'billing', action: 'CREATE', granted: true, category: 'Financial Management' },
  { id: 'billing_READ', resource: 'billing', action: 'READ', granted: true, category: 'Financial Management' },
  { id: 'billing_UPDATE', resource: 'billing', action: 'UPDATE', granted: true, category: 'Financial Management' },
  { id: 'billing_DELETE', resource: 'billing', action: 'DELETE', granted: true, category: 'Financial Management' },
  { id: 'billing_MANAGE', resource: 'billing', action: 'MANAGE', granted: true, category: 'Financial Management' },
  { id: 'financial_reports_READ', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial Management' },
  { id: 'financial_reports_CREATE', resource: 'financial_reports', action: 'CREATE', granted: true, category: 'Financial Management' },
  { id: 'financial_reports_MANAGE', resource: 'financial_reports', action: 'MANAGE', granted: true, category: 'Financial Management' },
  { id: 'payments_CREATE', resource: 'payments', action: 'CREATE', granted: true, category: 'Financial Management' },
  { id: 'payments_READ', resource: 'payments', action: 'READ', granted: true, category: 'Financial Management' },
  { id: 'payments_UPDATE', resource: 'payments', action: 'UPDATE', granted: true, category: 'Financial Management' },
  { id: 'payments_DELETE', resource: 'payments', action: 'DELETE', granted: true, category: 'Financial Management' },
  { id: 'payments_MANAGE', resource: 'payments', action: 'MANAGE', granted: true, category: 'Financial Management' },

  // Inventory Management
  { id: 'inventory_CREATE', resource: 'inventory', action: 'CREATE', granted: true, category: 'Inventory Management' },
  { id: 'inventory_READ', resource: 'inventory', action: 'READ', granted: true, category: 'Inventory Management' },
  { id: 'inventory_UPDATE', resource: 'inventory', action: 'UPDATE', granted: true, category: 'Inventory Management' },
  { id: 'inventory_DELETE', resource: 'inventory', action: 'DELETE', granted: true, category: 'Inventory Management' },
  { id: 'inventory_MANAGE', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Inventory Management' },
  { id: 'medications_CREATE', resource: 'medications', action: 'CREATE', granted: true, category: 'Inventory Management' },
  { id: 'medications_READ', resource: 'medications', action: 'READ', granted: true, category: 'Inventory Management' },
  { id: 'medications_UPDATE', resource: 'medications', action: 'UPDATE', granted: true, category: 'Inventory Management' },
  { id: 'medications_DELETE', resource: 'medications', action: 'DELETE', granted: true, category: 'Inventory Management' },
  { id: 'medications_MANAGE', resource: 'medications', action: 'MANAGE', granted: true, category: 'Inventory Management' },

  // Medical Imaging
  { id: 'imaging_CREATE', resource: 'imaging', action: 'CREATE', granted: true, category: 'Medical Imaging' },
  { id: 'imaging_READ', resource: 'imaging', action: 'READ', granted: true, category: 'Medical Imaging' },
  { id: 'imaging_UPDATE', resource: 'imaging', action: 'UPDATE', granted: true, category: 'Medical Imaging' },
  { id: 'imaging_DELETE', resource: 'imaging', action: 'DELETE', granted: true, category: 'Medical Imaging' },
  { id: 'imaging_MANAGE', resource: 'imaging', action: 'MANAGE', granted: true, category: 'Medical Imaging' },

  // Reports & Analytics
  { id: 'reports_CREATE', resource: 'reports', action: 'CREATE', granted: true, category: 'Reports & Analytics' },
  { id: 'reports_READ', resource: 'reports', action: 'READ', granted: true, category: 'Reports & Analytics' },
  { id: 'reports_UPDATE', resource: 'reports', action: 'UPDATE', granted: true, category: 'Reports & Analytics' },
  { id: 'reports_DELETE', resource: 'reports', action: 'DELETE', granted: true, category: 'Reports & Analytics' },
  { id: 'reports_MANAGE', resource: 'reports', action: 'MANAGE', granted: true, category: 'Reports & Analytics' },
  { id: 'analytics_READ', resource: 'analytics', action: 'READ', granted: true, category: 'Reports & Analytics' },
  { id: 'analytics_MANAGE', resource: 'analytics', action: 'MANAGE', granted: true, category: 'Reports & Analytics' },

  // System Administration
  { id: 'system_settings_CREATE', resource: 'system_settings', action: 'CREATE', granted: true, category: 'System Administration' },
  { id: 'system_settings_READ', resource: 'system_settings', action: 'READ', granted: true, category: 'System Administration' },
  { id: 'system_settings_UPDATE', resource: 'system_settings', action: 'UPDATE', granted: true, category: 'System Administration' },
  { id: 'system_settings_DELETE', resource: 'system_settings', action: 'DELETE', granted: true, category: 'System Administration' },
  { id: 'system_settings_MANAGE', resource: 'system_settings', action: 'MANAGE', granted: true, category: 'System Administration' },
  { id: 'audit_logs_READ', resource: 'audit_logs', action: 'READ', granted: true, category: 'System Administration' },
  { id: 'audit_logs_MANAGE', resource: 'audit_logs', action: 'MANAGE', granted: true, category: 'System Administration' },
  { id: 'system_backups_CREATE', resource: 'system_backups', action: 'CREATE', granted: true, category: 'System Administration' },
  { id: 'system_backups_READ', resource: 'system_backups', action: 'READ', granted: true, category: 'System Administration' },
  { id: 'system_backups_MANAGE', resource: 'system_backups', action: 'MANAGE', granted: true, category: 'System Administration' },

  // Communication
  { id: 'notifications_CREATE', resource: 'notifications', action: 'CREATE', granted: true, category: 'Communication' },
  { id: 'notifications_READ', resource: 'notifications', action: 'READ', granted: true, category: 'Communication' },
  { id: 'notifications_UPDATE', resource: 'notifications', action: 'UPDATE', granted: true, category: 'Communication' },
  { id: 'notifications_DELETE', resource: 'notifications', action: 'DELETE', granted: true, category: 'Communication' },
  { id: 'notifications_MANAGE', resource: 'notifications', action: 'MANAGE', granted: true, category: 'Communication' },
  { id: 'messaging_CREATE', resource: 'messaging', action: 'CREATE', granted: true, category: 'Communication' },
  { id: 'messaging_READ', resource: 'messaging', action: 'READ', granted: true, category: 'Communication' },
  { id: 'messaging_UPDATE', resource: 'messaging', action: 'UPDATE', granted: true, category: 'Communication' },
  { id: 'messaging_DELETE', resource: 'messaging', action: 'DELETE', granted: true, category: 'Communication' },
  { id: 'messaging_MANAGE', resource: 'messaging', action: 'MANAGE', granted: true, category: 'Communication' },

  // Telemedicine
  { id: 'telemedicine_CREATE', resource: 'telemedicine', action: 'CREATE', granted: true, category: 'Telemedicine' },
  { id: 'telemedicine_READ', resource: 'telemedicine', action: 'READ', granted: true, category: 'Telemedicine' },
  { id: 'telemedicine_UPDATE', resource: 'telemedicine', action: 'UPDATE', granted: true, category: 'Telemedicine' },
  { id: 'telemedicine_DELETE', resource: 'telemedicine', action: 'DELETE', granted: true, category: 'Telemedicine' },
  { id: 'telemedicine_MANAGE', resource: 'telemedicine', action: 'MANAGE', granted: true, category: 'Telemedicine' },

  // Marketplace
  { id: 'marketplace_READ', resource: 'marketplace', action: 'READ', granted: true, category: 'Marketplace' },
  { id: 'marketplace_MANAGE', resource: 'marketplace', action: 'MANAGE', granted: true, category: 'Marketplace' },
  { id: 'addons_CREATE', resource: 'addons', action: 'CREATE', granted: true, category: 'Marketplace' },
  { id: 'addons_READ', resource: 'addons', action: 'READ', granted: true, category: 'Marketplace' },
  { id: 'addons_UPDATE', resource: 'addons', action: 'UPDATE', granted: true, category: 'Marketplace' },
  { id: 'addons_DELETE', resource: 'addons', action: 'DELETE', granted: true, category: 'Marketplace' },
  { id: 'addons_MANAGE', resource: 'addons', action: 'MANAGE', granted: true, category: 'Marketplace' },

  // All-Access Permissions
  { id: 'ALL_RESOURCES_FULL_ACCESS', resource: '*', action: '*', granted: true, category: 'System Administration' },
  { id: 'CROSS_PRACTICE_ACCESS', resource: 'practices', action: 'SWITCH', granted: true, category: 'System Administration' },
  { id: 'SUPER_ADMIN_OVERRIDE', resource: '*', action: 'OVERRIDE', granted: true, category: 'System Administration' },
];

async function updateSuperAdminPermissions() {
  try {
    console.log('🔄 Updating SUPER_ADMIN permissions...');

    // Update the SUPER_ADMIN role with comprehensive permissions
    const result = await db
      .update(roles)
      .set({
        permissions: SUPER_ADMIN_PERMISSIONS,
        updatedAt: new Date()
      })
      .where(eq(roles.name, 'SUPER_ADMIN'));

    console.log('✅ SUPER_ADMIN permissions updated successfully!');
    console.log(`📊 Total permissions granted: ${SUPER_ADMIN_PERMISSIONS.length}`);
    
    // Log permission categories
    const categories = [...new Set(SUPER_ADMIN_PERMISSIONS.map(p => p.category))];
    console.log(`📋 Permission categories: ${categories.join(', ')}`);

    return result;
  } catch (error) {
    console.error('❌ Error updating SUPER_ADMIN permissions:', error);
    throw error;
  }
}

// Run the update
updateSuperAdminPermissions()
  .then(() => {
    console.log('🎉 SUPER_ADMIN permissions update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to update SUPER_ADMIN permissions:', error);
    process.exit(1);
  });
