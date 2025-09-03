import { db } from './src/db';
import { roles } from './src/db/schema';

async function checkRolesTable() {
  try {
    console.log('🔍 Checking roles table...\n');
    
    // Get all roles from the roles table
    const allRoles = await db.query.roles.findMany({
      columns: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isSystemDefined: true,
        isActive: true,
        practiceId: true,
      },
      orderBy: (roles, { asc }) => [asc(roles.name)],
    });

    console.log('📋 Roles in database:');
    if (allRoles.length === 0) {
      console.log('  ❌ No roles found in the roles table!');
      console.log('  This explains why the RBAC role checking is failing.');
    } else {
      allRoles.forEach(role => {
        console.log(`  ${role.name} (${role.displayName}) - System: ${role.isSystemDefined}, Active: ${role.isActive}, Practice: ${role.practiceId || 'Global'}`);
      });
    }

    console.log('\n🔍 Required roles for login:');
    const requiredRoles = ['ADMINISTRATOR', 'SUPER_ADMIN', 'PRACTICE_ADMINISTRATOR', 'PRACTICE_ADMIN', 'VETERINARIAN', 'TECHNICIAN', 'RECEPTIONIST', 'CLIENT'];
    
    requiredRoles.forEach(reqRole => {
      const found = allRoles.find(role => role.name === reqRole);
      console.log(`  ${reqRole}: ${found ? '✅ Found' : '❌ Missing'}`);
    });

  } catch (error) {
    console.error('❌ Error checking roles table:', error);
  }
}

// Run the function
checkRolesTable();
