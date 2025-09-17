// Test script to check health plan milestones in the database
const { db } = require('./src/db/index.ts');
const { healthPlans, healthPlanMilestones } = require('./src/db/schema.ts');

async function testHealthPlanMilestones() {
  try {
    console.log('🔍 Testing health plan milestones...');
    
    // Get all health plans
    const allHealthPlans = await db.query.healthPlans.findMany({
      with: {
        milestones: {
          orderBy: (healthPlanMilestones, { asc }) => [asc(healthPlanMilestones.dueDate)]
        }
      }
    });
    
    console.log(`📊 Found ${allHealthPlans.length} health plans`);
    
    allHealthPlans.forEach((plan, index) => {
      console.log(`\n📋 Health Plan ${index + 1}:`);
      console.log(`  ID: ${plan.id}`);
      console.log(`  Name: ${plan.name}`);
      console.log(`  Pet ID: ${plan.petId}`);
      console.log(`  Milestones: ${plan.milestones?.length || 0}`);
      
      if (plan.milestones && plan.milestones.length > 0) {
        plan.milestones.forEach((milestone, mIndex) => {
          console.log(`    ${mIndex + 1}. ${milestone.title} (completed: ${milestone.completed})`);
        });
      } else {
        console.log(`    ❌ No milestones found for this health plan`);
      }
    });
    
    // Also check all milestones directly
    console.log('\n🎯 All milestones in database:');
    const allMilestones = await db.query.healthPlanMilestones.findMany();
    console.log(`Total milestones: ${allMilestones.length}`);
    
    allMilestones.forEach((milestone, index) => {
      console.log(`  ${index + 1}. Health Plan ${milestone.healthPlanId}: ${milestone.title}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing health plan milestones:', error);
  }
}

testHealthPlanMilestones();
