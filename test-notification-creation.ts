/**
 * Quick test to create a past scheduled appointment and trigger automation
 */
import { db } from './src/db';
import { appointments } from './src/db/schemas/appointmentsSchema';
import { AppointmentAutomation } from './src/websocket-server/appointment-automation';

async function testNotificationCreation() {
  console.log('🧪 Testing notification creation...');
  
  try {
    // First, let's create a test scheduled appointment in the past
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2); // 2 hours ago
    
    console.log('📅 Creating test appointment in the past...');
    const [testAppointment] = await db.insert(appointments).values({
      title: 'Test Auto-Update Appointment',
      date: pastDate,
      status: 'scheduled', // This should trigger auto-update
      practiceId: 1, // Using a practice ID
      clientId: 3, // Using client ID 3 (from your logs)
      petId: 1,
      type: 'in-person',
      description: 'Test appointment for automation and notifications'
    }).returning();
    
    console.log('✅ Test appointment created:', testAppointment);
    
    // Now run the automation manually
    console.log('🔄 Running automation manually...');
    const automation = new AppointmentAutomation();
    await automation.runManually();
    
    console.log('✅ Automation completed. Check the logs above for notification results.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testNotificationCreation();
