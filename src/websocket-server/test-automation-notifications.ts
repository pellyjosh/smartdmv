/**
 * Test script to manually trigger appointment automation and check notifications
 */

import { AppointmentAutomation } from './appointment-automation';

async function testAppointmentAutomation() {
  console.log('🧪 Testing appointment automation...');
  
  const automation = new AppointmentAutomation();
  
  try {
    // Run the automation manually
    await automation.runManually();
    
    console.log('✅ Automation test completed');
    console.log('📧 Check your notifications tab to see if any no-show notifications were created');
    
  } catch (error) {
    console.error('❌ Automation test failed:', error);
  }
  
  process.exit(0);
}

// Run the test
testAppointmentAutomation();
