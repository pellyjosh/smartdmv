import { db } from './src/db';
import { users } from './src/db/schema';

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user roles in database...\n');
    
    // Get all users and their roles
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        practiceId: true,
        currentPracticeId: true,
      },
      orderBy: (users, { asc }) => [asc(users.role), asc(users.email)],
    });

    console.log('👥 All users and their roles:');
    allUsers.forEach(user => {
      console.log(`  ${user.email} - Role: ${user.role} - Practice: ${user.practiceId} - Current: ${user.currentPracticeId}`);
    });

    // Group by role to see what roles exist
    const roleGroups = allUsers.reduce((acc, user) => {
      const role = Array.isArray(user.role) ? user.role[0] : user.role;
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(user);
      return acc;
    }, {} as Record<string, typeof allUsers>);

    console.log('\n📊 Users grouped by role:');
    Object.entries(roleGroups).forEach(([role, users]) => {
      console.log(`  ${role}: ${users.length} users`);
      users.forEach(user => {
        console.log(`    - ${user.email}`);
      });
    });

    // Check which roles might not be handled in login
    const handledRoles = ['ADMINISTRATOR', 'SUPER_ADMIN', 'PRACTICE_ADMINISTRATOR', 'PRACTICE_ADMIN', 'CLIENT'];
    const allRoles = Object.keys(roleGroups);
    const unhandledRoles = allRoles.filter(role => !handledRoles.includes(role));

    if (unhandledRoles.length > 0) {
      console.log('\n⚠️  Roles that might not be handled in login:');
      unhandledRoles.forEach(role => {
        console.log(`  - ${role} (${roleGroups[role].length} users)`);
      });
    } else {
      console.log('\n✅ All user roles appear to be handled in login logic');
    }

  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  }
}

// Run the function
checkUserRoles();
