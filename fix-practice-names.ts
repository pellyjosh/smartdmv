import { db } from './src/db';
import { practices, administratorAccessiblePractices, users } from './src/db/schema';

async function checkPracticeData() {
  try {
    console.log('🔍 Checking current practice data...\n');
    
    // Get all practices
    const allPractices = await db.query.practices.findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (practices, { asc }) => [asc(practices.id)],
    });

    console.log('📋 Current practices in database:');
    allPractices.forEach(practice => {
      console.log(`  ID: ${practice.id}, Name: "${practice.name}"`);
    });

    // Get administrator accessible practices
    console.log('\n🔗 Administrator accessible practices:');
    const adminPractices = await db.query.administratorAccessiblePractices.findMany({
      with: {
        practice: {
          columns: {
            id: true,
            name: true,
          }
        },
        administrator: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    adminPractices.forEach(ap => {
      console.log(`  Admin: ${ap.administrator.name} (${ap.administrator.email}) -> Practice: ${ap.practice.name} (ID: ${ap.practice.id})`);
    });

    // Check some users and their practice assignments
    console.log('\n👥 Sample users and their practice assignments:');
    const sampleUsers = await db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        practiceId: true,
        currentPracticeId: true,
      },
      limit: 10,
    });

    sampleUsers.forEach(user => {
      console.log(`  User: ${user.name} (${user.email}) - Role: ${user.role} - Practice: ${user.practiceId} - Current: ${user.currentPracticeId}`);
    });

  } catch (error) {
    console.error('❌ Error checking practice data:', error);
  }
}

// Run the function
checkPracticeData();
