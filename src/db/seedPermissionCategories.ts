import { db } from '@/db';
import { permissionCategories, permissionResources, permissionActions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const samplePermissionCategories = [
  {
    name: 'Users & Access',
    description: 'Permissions for managing users, roles, and access controls',
    displayOrder: 1,
    icon: 'users',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'users',
        description: 'User account management',
        actions: [
          { name: 'CREATE', description: 'Create new users' },
          { name: 'READ', description: 'View user information' },
          { name: 'UPDATE', description: 'Update user details' },
          { name: 'DELETE', description: 'Delete user accounts' },
          { name: 'MANAGE', description: 'Full user management' },
        ]
      },
      {
        name: 'roles',
        description: 'Role and permission management',
        actions: [
          { name: 'CREATE', description: 'Create new roles' },
          { name: 'READ', description: 'View roles' },
          { name: 'UPDATE', description: 'Update role permissions' },
          { name: 'DELETE', description: 'Delete roles' },
          { name: 'MANAGE', description: 'Full role management' },
        ]
      },
      {
        name: 'permissions',
        description: 'Permission management',
        actions: [
          { name: 'CREATE', description: 'Create permissions' },
          { name: 'READ', description: 'View permissions' },
          { name: 'UPDATE', description: 'Update permissions' },
          { name: 'DELETE', description: 'Delete permissions' },
          { name: 'MANAGE', description: 'Full permission management' },
        ]
      },
      {
        name: 'custom_roles',
        description: 'Custom role management',
        actions: [
          { name: 'CREATE', description: 'Create custom roles' },
          { name: 'UPDATE', description: 'Update custom roles' },
        ]
      }
    ]
  },
  {
    name: 'Patients & Records',
    description: 'Permissions for managing patient records and medical information',
    displayOrder: 2,
    icon: 'file-text',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'patients',
        description: 'Patient management',
        actions: [
          { name: 'CREATE', description: 'Create patient records' },
          { name: 'READ', description: 'View patient information' },
          { name: 'UPDATE', description: 'Update patient records' },
          { name: 'DELETE', description: 'Delete patient records' },
          { name: 'MANAGE', description: 'Full patient management' },
        ]
      },
      {
        name: 'medical_records',
        description: 'Medical record management',
        actions: [
          { name: 'CREATE', description: 'Create medical records' },
          { name: 'READ', description: 'View medical records' },
          { name: 'UPDATE', description: 'Update medical records' },
          { name: 'DELETE', description: 'Delete medical records' },
          { name: 'MANAGE', description: 'Full medical record management' },
        ]
      },
      {
        name: 'appointments',
        description: 'Appointment scheduling and management',
        actions: [
          { name: 'CREATE', description: 'Schedule appointments' },
          { name: 'READ', description: 'View appointments' },
          { name: 'UPDATE', description: 'Modify appointments' },
          { name: 'DELETE', description: 'Cancel appointments' },
          { name: 'MANAGE', description: 'Full appointment management' },
        ]
      },
      {
        name: 'clients',
        description: 'Client management',
        actions: [
          { name: 'CREATE', description: 'Create client records' },
          { name: 'READ', description: 'View client information' },
          { name: 'UPDATE', description: 'Update client records' },
        ]
      },
      {
        name: 'health_plans',
        description: 'Health plan management',
        actions: [
          { name: 'MANAGE', description: 'Manage health plans' },
        ]
      }
    ]
  },
  {
    name: 'Medical',
    description: 'Permissions for medical procedures, treatments, and clinical operations',
    displayOrder: 3,
    icon: 'heart',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'treatments',
        description: 'Treatment management',
        actions: [
          { name: 'CREATE', description: 'Create treatments' },
          { name: 'READ', description: 'View treatments' },
          { name: 'UPDATE', description: 'Update treatments' },
          { name: 'DELETE', description: 'Delete treatments' },
          { name: 'MANAGE', description: 'Full treatment management' },
        ]
      },
      {
        name: 'prescriptions',
        description: 'Prescription management',
        actions: [
          { name: 'CREATE', description: 'Create prescriptions' },
          { name: 'READ', description: 'View prescriptions' },
          { name: 'UPDATE', description: 'Update prescriptions' },
          { name: 'MANAGE', description: 'Full prescription management' },
          { name: 'DISPENSE', description: 'Dispense medications' },
        ]
      },
      {
        name: 'vaccinations',
        description: 'Vaccination management',
        actions: [
          { name: 'CREATE', description: 'Record vaccinations' },
          { name: 'READ', description: 'View vaccination records' },
          { name: 'UPDATE', description: 'Update vaccination records' },
          { name: 'DELETE', description: 'Delete vaccination records' },
          { name: 'MANAGE', description: 'Full vaccination management' },
        ]
      },
      {
        name: 'lab',
        description: 'Laboratory management',
        actions: [
          { name: 'MANAGE', description: 'Full laboratory management' },
        ]
      },
      {
        name: 'lab_orders',
        description: 'Laboratory order management',
        actions: [
          { name: 'CREATE', description: 'Create lab orders' },
          { name: 'READ', description: 'View lab orders' },
          { name: 'UPDATE', description: 'Update lab orders' },
          { name: 'DELETE', description: 'Delete lab orders' },
          { name: 'MANAGE', description: 'Full lab order management' },
        ]
      },
      {
        name: 'lab_results',
        description: 'Laboratory result management',
        actions: [
          { name: 'CREATE', description: 'Create lab results' },
          { name: 'READ', description: 'View lab results' },
          { name: 'UPDATE', description: 'Update lab results' },
          { name: 'DELETE', description: 'Delete lab results' },
          { name: 'MANAGE', description: 'Full lab result management' },
        ]
      }
    ]
  },
  {
    name: 'Financial',
    description: 'Permissions for billing, payments, and financial operations',
    displayOrder: 4,
    icon: 'dollar-sign',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'billing',
        description: 'Billing operations',
        actions: [
          { name: 'CREATE', description: 'Create invoices' },
          { name: 'READ', description: 'View billing information' },
          { name: 'UPDATE', description: 'Update billing records' },
          { name: 'DELETE', description: 'Delete billing records' },
          { name: 'MANAGE', description: 'Full billing management' },
        ]
      },
      {
        name: 'payments',
        description: 'Payment processing',
        actions: [
          { name: 'CREATE', description: 'Process payments' },
          { name: 'READ', description: 'View payment information' },
          { name: 'UPDATE', description: 'Update payment records' },
          { name: 'DELETE', description: 'Delete payment records' },
          { name: 'MANAGE', description: 'Full payment management' },
        ]
      },
      {
        name: 'invoices',
        description: 'Invoice management',
        actions: [
          { name: 'CREATE', description: 'Create invoices' },
          { name: 'READ', description: 'View invoices' },
          { name: 'UPDATE', description: 'Update invoices' },
        ]
      },
      {
        name: 'financial_reports',
        description: 'Financial reporting',
        actions: [
          { name: 'CREATE', description: 'Create financial reports' },
          { name: 'READ', description: 'View financial reports' },
          { name: 'MANAGE', description: 'Manage financial reports' },
        ]
      },
      {
        name: 'financial_basic',
        description: 'Basic financial operations',
        actions: [
          { name: 'READ', description: 'View basic financial information' },
        ]
      },
      {
        name: 'financial_manage',
        description: 'Financial management',
        actions: [
          { name: 'UPDATE', description: 'Update financial settings' },
        ]
      }
    ]
  },
  {
    name: 'Operations',
    description: 'Permissions for day-to-day operational activities',
    displayOrder: 5,
    icon: 'settings',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'inventory',
        description: 'Inventory management',
        actions: [
          { name: 'CREATE', description: 'Add inventory items' },
          { name: 'READ', description: 'View inventory' },
          { name: 'UPDATE', description: 'Update inventory levels' },
          { name: 'DELETE', description: 'Remove inventory items' },
          { name: 'MANAGE', description: 'Full inventory management' },
        ]
      },
      {
        name: 'staff_scheduling',
        description: 'Staff scheduling',
        actions: [
          { name: 'MANAGE', description: 'Manage staff schedules' },
        ]
      },
      {
        name: 'office_operations',
        description: 'Office operations',
        actions: [
          { name: 'MANAGE', description: 'Manage office operations' },
        ]
      }
    ]
  },
  {
    name: 'System Management',
    description: 'Permissions for system-level administration and practice management',
    displayOrder: 6,
    icon: 'server',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'practices',
        description: 'Practice management',
        actions: [
          { name: 'CREATE', description: 'Create practices' },
          { name: 'READ', description: 'View practice information' },
          { name: 'UPDATE', description: 'Update practice settings' },
          { name: 'DELETE', description: 'Delete practices' },
        ]
      }
    ]
  },
  {
    name: 'System',
    description: 'System-level permissions and administrative functions',
    displayOrder: 7,
    icon: 'cpu',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'admin',
        description: 'System administration',
        actions: [
          { name: 'ALL', description: 'Full system administration access' },
        ]
      },
      {
        name: 'system_settings',
        description: 'System settings management',
        actions: [
          { name: 'CREATE', description: 'Create system settings' },
          { name: 'READ', description: 'View system settings' },
          { name: 'UPDATE', description: 'Update system settings' },
          { name: 'DELETE', description: 'Delete system settings' },
          { name: 'MANAGE', description: 'Full system settings management' },
        ]
      },
      {
        name: 'system_backups',
        description: 'System backup management',
        actions: [
          { name: 'CREATE', description: 'Create system backups' },
          { name: 'READ', description: 'View backup information' },
          { name: 'MANAGE', description: 'Manage system backups' },
        ]
      }
    ]
  },
  {
    name: 'Practice Management',
    description: 'Practice-specific management and settings',
    displayOrder: 8,
    icon: 'building',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'practice_settings',
        description: 'Practice settings management',
        actions: [
          { name: 'CREATE', description: 'Create practice settings' },
          { name: 'READ', description: 'View practice settings' },
          { name: 'UPDATE', description: 'Update practice settings' },
          { name: 'DELETE', description: 'Delete practice settings' },
          { name: 'MANAGE', description: 'Full practice settings management' },
        ]
      },
      {
        name: 'practice_access',
        description: 'Practice access control',
        actions: [
          { name: 'ALL', description: 'Full practice access control' },
        ]
      },
      {
        name: 'practice_admin',
        description: 'Practice administration',
        actions: [
          { name: 'ALL', description: 'Full practice administration' },
        ]
      },
      {
        name: 'practice_switching',
        description: 'Practice switching capabilities',
        actions: [
          { name: 'MANAGE', description: 'Manage practice switching' },
        ]
      }
    ]
  },
  {
    name: 'Medical Imaging',
    description: 'Permissions for medical imaging and diagnostic equipment',
    displayOrder: 9,
    icon: 'camera',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'imaging',
        description: 'Medical imaging management',
        actions: [
          { name: 'CREATE', description: 'Create imaging records' },
          { name: 'READ', description: 'View imaging records' },
          { name: 'UPDATE', description: 'Update imaging records' },
          { name: 'DELETE', description: 'Delete imaging records' },
          { name: 'MANAGE', description: 'Full imaging management' },
        ]
      }
    ]
  },
  {
    name: 'Inventory',
    description: 'Medication and supply inventory management',
    displayOrder: 10,
    icon: 'package',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'medications',
        description: 'Medication inventory management',
        actions: [
          { name: 'CREATE', description: 'Add medications to inventory' },
          { name: 'READ', description: 'View medication inventory' },
          { name: 'UPDATE', description: 'Update medication information' },
          { name: 'DELETE', description: 'Remove medications from inventory' },
          { name: 'MANAGE', description: 'Full medication management' },
        ]
      }
    ]
  },
  {
    name: 'Treatments & Procedures',
    description: 'Specialized treatment and procedure management',
    displayOrder: 11,
    icon: 'activity',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'procedures',
        description: 'Medical procedures management',
        actions: [
          { name: 'CREATE', description: 'Create procedure records' },
          { name: 'READ', description: 'View procedure information' },
          { name: 'UPDATE', description: 'Update procedure records' },
          { name: 'DELETE', description: 'Delete procedure records' },
          { name: 'MANAGE', description: 'Full procedure management' },
        ]
      }
    ]
  },
  {
    name: 'Telemedicine',
    description: 'Remote consultation and telemedicine capabilities',
    displayOrder: 12,
    icon: 'video',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'telemedicine',
        description: 'Telemedicine services',
        actions: [
          { name: 'CREATE', description: 'Create telemedicine sessions' },
          { name: 'READ', description: 'View telemedicine records' },
          { name: 'UPDATE', description: 'Update telemedicine information' },
          { name: 'DELETE', description: 'Delete telemedicine records' },
          { name: 'MANAGE', description: 'Full telemedicine management' },
        ]
      }
    ]
  },
  {
    name: 'Reporting',
    description: 'Report generation and analytics',
    displayOrder: 13,
    icon: 'bar-chart',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'reports',
        description: 'Report management',
        actions: [
          { name: 'CREATE', description: 'Create reports' },
          { name: 'READ', description: 'View reports' },
          { name: 'UPDATE', description: 'Update reports' },
          { name: 'DELETE', description: 'Delete reports' },
          { name: 'MANAGE', description: 'Full report management' },
        ]
      }
    ]
  },
  {
    name: 'Analytics',
    description: 'Data analytics and insights',
    displayOrder: 14,
    icon: 'trending-up',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'analytics',
        description: 'Analytics and insights',
        actions: [
          { name: 'READ', description: 'View analytics data' },
          { name: 'MANAGE', description: 'Manage analytics settings' },
        ]
      }
    ]
  },
  {
    name: 'Communications',
    description: 'Messaging and communication tools',
    displayOrder: 15,
    icon: 'message-circle',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'messaging',
        description: 'Messaging and communications',
        actions: [
          { name: 'CREATE', description: 'Create messages' },
          { name: 'READ', description: 'View messages' },
          { name: 'UPDATE', description: 'Update messages' },
          { name: 'DELETE', description: 'Delete messages' },
          { name: 'MANAGE', description: 'Full messaging management' },
        ]
      }
    ]
  },
  {
    name: 'Notifications',
    description: 'Notification and alert management',
    displayOrder: 16,
    icon: 'bell',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'notifications',
        description: 'Notification management',
        actions: [
          { name: 'CREATE', description: 'Create notifications' },
          { name: 'READ', description: 'View notifications' },
          { name: 'UPDATE', description: 'Update notifications' },
          { name: 'DELETE', description: 'Delete notifications' },
          { name: 'MANAGE', description: 'Full notification management' },
        ]
      }
    ]
  },
  {
    name: 'Marketplace',
    description: 'Addon and marketplace management',
    displayOrder: 17,
    icon: 'shopping-cart',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'addons',
        description: 'Addon management',
        actions: [
          { name: 'CREATE', description: 'Create addons' },
          { name: 'READ', description: 'View addons' },
          { name: 'UPDATE', description: 'Update addons' },
          { name: 'DELETE', description: 'Delete addons' },
          { name: 'MANAGE', description: 'Full addon management' },
        ]
      },
      {
        name: 'marketplace',
        description: 'Marketplace operations',
        actions: [
          { name: 'READ', description: 'View marketplace' },
          { name: 'MANAGE', description: 'Manage marketplace' },
        ]
      }
    ]
  },
  {
    name: 'Configuration',
    description: 'System and application configuration',
    displayOrder: 18,
    icon: 'sliders',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'custom_fields',
        description: 'Custom field configuration',
        actions: [
          { name: 'MANAGE', description: 'Manage custom fields' },
        ]
      }
    ]
  },
  {
    name: 'Workflow',
    description: 'Workflow and process management',
    displayOrder: 19,
    icon: 'workflow',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'checklists',
        description: 'Checklist and workflow management',
        actions: [
          { name: 'MANAGE', description: 'Manage checklists and workflows' },
        ]
      }
    ]
  },
  {
    name: 'Audit',
    description: 'Audit trail and compliance monitoring',
    displayOrder: 20,
    icon: 'search',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'audit_logs',
        description: 'Audit log management',
        actions: [
          { name: 'READ', description: 'View audit logs' },
          { name: 'MANAGE', description: 'Manage audit settings' },
        ]
      }
    ]
  },
  {
    name: 'Collaboration',
    description: 'Team collaboration tools',
    displayOrder: 21,
    icon: 'users',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'whiteboard',
        description: 'Collaborative whiteboard',
        actions: [
          { name: 'UPDATE', description: 'Update whiteboard content' },
        ]
      }
    ]
  },
  {
    name: 'Personal Records',
    description: 'Client personal record access',
    displayOrder: 22,
    icon: 'user',
    isActive: true,
    isSystemDefined: true,
    practiceId: 1,
    resources: [
      {
        name: 'own_pets',
        description: 'Personal pet records',
        actions: [
          { name: 'READ', description: 'View own pet records' },
        ]
      },
      {
        name: 'own_appointments',
        description: 'Personal appointment records',
        actions: [
          { name: 'CREATE', description: 'Create own appointments' },
          { name: 'READ', description: 'View own appointments' },
        ]
      },
      {
        name: 'own_medical_records',
        description: 'Personal medical records',
        actions: [
          { name: 'READ', description: 'View own medical records' },
        ]
      },
      {
        name: 'profile',
        description: 'Personal profile management',
        actions: [
          { name: 'UPDATE', description: 'Update personal profile' },
        ]
      }
    ]
  }
];

export async function seedPermissionCategories() {
  try {
    console.log('Starting permission categories seeding...');

    for (const categoryData of samplePermissionCategories) {
      // Check if category exists, update if it does, create if it doesn't
      let category;
      const existingCategory = await db.select()
        .from(permissionCategories)
        .where(eq(permissionCategories.name, categoryData.name))
        .limit(1);

      if (existingCategory.length > 0) {
        // Update existing category
        [category] = await db.update(permissionCategories)
          .set({
            description: categoryData.description,
            displayOrder: categoryData.displayOrder,
            icon: categoryData.icon,
            isActive: categoryData.isActive,
            isSystemDefined: categoryData.isSystemDefined,
            practiceId: categoryData.practiceId,
            updatedAt: new Date(),
          })
          .where(eq(permissionCategories.id, existingCategory[0].id))
          .returning();
        
        console.log(`Updated category: ${category.name}`);
      } else {
        // Create new category
        [category] = await db.insert(permissionCategories).values({
          name: categoryData.name,
          description: categoryData.description,
          displayOrder: categoryData.displayOrder,
          icon: categoryData.icon,
          isActive: categoryData.isActive,
          isSystemDefined: categoryData.isSystemDefined,
          practiceId: categoryData.practiceId,
        }).returning();

        console.log(`Created category: ${category.name}`);
      }

      // Process resources for this category
      for (const resourceData of categoryData.resources) {
        // Check if resource exists in this category
        let resource;
        const existingResource = await db.select()
          .from(permissionResources)
          .where(and(
            eq(permissionResources.categoryId, category.id),
            eq(permissionResources.name, resourceData.name)
          ))
          .limit(1);

        if (existingResource.length > 0) {
          // Update existing resource
          [resource] = await db.update(permissionResources)
            .set({
              description: resourceData.description,
              updatedAt: new Date(),
            })
            .where(eq(permissionResources.id, existingResource[0].id))
            .returning();
          
          console.log(`  Updated resource: ${resource.name}`);
        } else {
          // Create new resource
          [resource] = await db.insert(permissionResources).values({
            categoryId: category.id,
            name: resourceData.name,
            description: resourceData.description,
          }).returning();

          console.log(`  Created resource: ${resource.name}`);
        }

        // Process actions for this resource
        for (const actionData of resourceData.actions) {
          // Check if action exists for this resource
          let action;
          const existingAction = await db.select()
            .from(permissionActions)
            .where(and(
              eq(permissionActions.resourceId, resource.id),
              eq(permissionActions.name, actionData.name)
            ))
            .limit(1);

          if (existingAction.length > 0) {
            // Update existing action
            [action] = await db.update(permissionActions)
              .set({
                description: actionData.description,
                updatedAt: new Date(),
              })
              .where(eq(permissionActions.id, existingAction[0].id))
              .returning();
            
            console.log(`    Updated action: ${action.name}`);
          } else {
            // Create new action
            [action] = await db.insert(permissionActions).values({
              resourceId: resource.id,
              name: actionData.name,
              description: actionData.description,
            }).returning();

            console.log(`    Created action: ${action.name}`);
          }
        }
      }
    }

    console.log('Permission categories seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding permission categories:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedPermissionCategories()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
