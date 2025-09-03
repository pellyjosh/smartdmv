import { db } from './src/db/index';
import { administratorAccessiblePractices, practices, users } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function fixAdminPracticeAccess() {
  try {
    console.log('=== FIXING ADMINISTRATOR PRACTICE ACCESS ===');
    
    // Get all practices
    const allPractices = await db.select().from(practices);
    console.log(`Found ${allPractices.length} practices:`, allPractices.map(p => ({ id: p.id, name: p.name })));
    
    // Get all administrators
    const adminUsers = await db.select().from(users).where(eq(users.role, 'ADMINISTRATOR'));
    console.log(`Found ${adminUsers.length} administrators:`, adminUsers.map(u => ({ id: u.id, email: u.email })));
    
    for (const admin of adminUsers) {
      console.log(`\nProcessing admin: ${admin.email} (ID: ${admin.id})`);
      
      // Get current accessible practices for this admin
      const currentAccess = await db.select()
        .from(administratorAccessiblePractices)
        .where(eq(administratorAccessiblePractices.administratorId, admin.id));
      
      const currentPracticeIds = currentAccess.map(ca => ca.practiceId);
      console.log(`Current access: [${currentPracticeIds.join(', ')}]`);
      
      // Add missing practice access
      for (const practice of allPractices) {
        if (!currentPracticeIds.includes(practice.id)) {
          console.log(`Adding access to practice ${practice.id} (${practice.name})`);
          await db.insert(administratorAccessiblePractices).values({
            administratorId: admin.id,
            practiceId: practice.id,
            assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          console.log(`Already has access to practice ${practice.id} (${practice.name})`);
        }
      }
    }
    
    console.log('\n=== VERIFICATION ===');
    // Verify the changes
    for (const admin of adminUsers) {
      const finalAccess = await db.select()
        .from(administratorAccessiblePractices)
        .where(eq(administratorAccessiblePractices.administratorId, admin.id));
      
      console.log(`Admin ${admin.email} now has access to ${finalAccess.length} practices: [${finalAccess.map(fa => fa.practiceId).join(', ')}]`);
    }
    
    console.log('\n✅ Administrator practice access fixed!');
    
  } catch (error) {
    console.error('Error fixing admin practice access:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminPracticeAccess();
