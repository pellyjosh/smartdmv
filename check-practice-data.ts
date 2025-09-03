import { db } from './src/db/index';
import { users, administratorAccessiblePractices, practices } from './src/db/schema';

async function checkData() {
  try {
    console.log('=== CHECKING DATABASE DATA ===');
    
    const allUsers = await db.select().from(users);
    const allPractices = await db.select().from(practices);
    const adminPractices = await db.select().from(administratorAccessiblePractices);
    
    console.log('\n=== USERS ===');
    console.log(allUsers.map(u => ({ 
      id: u.id, 
      email: u.email, 
      role: u.role, 
      currentPracticeId: u.currentPracticeId,
      practiceId: u.practiceId 
    })));
    
    console.log('\n=== PRACTICES ===');
    console.log(allPractices.map(p => ({ id: p.id, name: p.name })));
    
    console.log('\n=== ADMINISTRATOR ACCESSIBLE PRACTICES ===');
    console.log(adminPractices);
    
    // Check if we have any admin users without accessible practices
    const adminUsers = allUsers.filter(u => u.role === 'ADMINISTRATOR' || u.role === 'SUPER_ADMIN');
    console.log('\n=== ADMIN USERS ANALYSIS ===');
    for (const admin of adminUsers) {
      const adminAccess = adminPractices.filter(ap => ap.administratorId === admin.id);
      console.log(`Admin ${admin.email} (ID: ${admin.id}) has access to ${adminAccess.length} practices:`, adminAccess.map(ap => ap.practiceId));
    }
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    process.exit(0);
  }
}

checkData();
