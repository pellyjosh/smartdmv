import { db } from './src/db';
import { pets, healthPlans } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function checkUserPetAccess() {
  try {
    console.log('🔍 Checking user-pet-health plan relationships...');
    
    // Check what pets belong to user 3
    const userPets = await db.query.pets.findMany({
      where: eq(pets.ownerId, 3),
      columns: { id: true, name: true, ownerId: true }
    });
    
    console.log(`📋 User ID 3 owns ${userPets.length} pets:`);
    userPets.forEach(pet => {
      console.log(`  - Pet ID ${pet.id}: ${pet.name}`);
    });
    
    // Check health plan 3
    const healthPlan3 = await db.query.healthPlans.findFirst({
      where: eq(healthPlans.id, 3),
      with: {
        pet: {
          columns: { id: true, name: true, ownerId: true }
        }
      }
    });
    
    console.log(`\n🏥 Health Plan 3:`);
    console.log(`  - Pet ID: ${healthPlan3?.petId}`);
    console.log(`  - Pet Name: ${healthPlan3?.pet?.name}`);
    console.log(`  - Pet Owner ID: ${healthPlan3?.pet?.ownerId}`);
    
    if (healthPlan3?.pet?.ownerId === 3) {
      console.log(`✅ User 3 SHOULD have access to health plan 3 (owns the pet)`);
    } else {
      console.log(`❌ User 3 should NOT have access to health plan 3 (doesn't own the pet)`);
    }
    
  } catch (error) {
    console.error('❌ Error checking access:', error);
  }
}

checkUserPetAccess();
