#!/usr/bin/env node

/**
 * Test script for appointment automation
 * Run this to test the appointment automation functionality
 */

import { AppointmentAutomation } from './appointment-automation';

async function test() {
  console.log('🧪 Testing appointment automation...');
  
  const automation = new AppointmentAutomation();
  
  try {
    await automation.runManually();
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
