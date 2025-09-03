import { db } from './src/db';
import { roles } from './src/db/schema';

async function addMissingRoles() {
  try {
    console.log('🔧 Adding missing roles to the database...\n');
    
    // Define the missing roles
    const missingRoles = [
      {
        name: 'ADMINISTRATOR',
        displayName: 'Administrator',
        description: 'System administrator with access to multiple practices',
        isSystemDefined: true,
        isActive: true,
        practiceId: null, // Global role
        permissions: JSON.stringify([
          { id: 'admin_all', resource: '*', action: '*', granted: true, category: 'administration' }
        ])
      },
      {
        name: 'PRACTICE_ADMIN',
        displayName: 'Practice Admin',
        description: 'Practice administrator (alias for PRACTICE_ADMINISTRATOR)',
        isSystemDefined: true,
        isActive: true,
        practiceId: null, // Global role
        permissions: JSON.stringify([
          { id: 'practice_admin_all', resource: 'practice', action: '*', granted: true, category: 'practice_management' }
        ])
      }
    ];

    for (const role of missingRoles) {
      // Check if role already exists
      const existingRole = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, role.name)
      });

      if (existingRole) {
        console.log(`  ✅ Role ${role.name} already exists, skipping`);
        continue;
      }

      // Insert the role
      const [insertedRole] = await db.insert(roles).values(role).returning();
      console.log(`  ✅ Added role: ${insertedRole.name} (${insertedRole.displayName})`);
    }

    console.log('\n🎉 Missing roles have been added successfully!');
    console.log('📝 The login should now work for ADMINISTRATOR users.');

  } catch (error) {
    console.error('❌ Error adding missing roles:', error);
  }
}

// Run the function
addMissingRoles();
