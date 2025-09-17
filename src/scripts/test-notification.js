// src/scripts/test-notification.js
/**
 * Test script to manually create a notification and test the system
 * Run this with: npx tsx src/scripts/test-notification.js
 */

import NotificationService from '../lib/notifications/notification-service.js';

async function testNotificationSystem() {
  console.log('🧪 Testing notification system...');
  
  try {
    // Test 1: Create a basic notification for a specific user
    console.log('\n📝 Test 1: Creating basic notification...');
    const result1 = await NotificationService.createNotification({
      userId: '1', // Replace with actual user ID
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      type: 'info'
    });
    console.log('Result:', result1);

    // Test 2: Create notification for practice recipients
    console.log('\n📝 Test 2: Creating notification for practice recipients...');
    const result2 = await NotificationService.createNotification({
      practiceId: '1', // Replace with actual practice ID
      title: 'Practice Alert',
      message: 'This is a practice-wide alert notification.',
      type: 'alert',
      recipients: ['admin', 'practitioner']
    });
    console.log('Result:', result2);

    // Test 3: Create appointment notification
    console.log('\n📝 Test 3: Creating appointment notification...');
    const result3 = await NotificationService.createAppointmentNotification({
      action: 'rescheduled',
      appointmentId: '123',
      practiceId: '1',
      petName: 'Fluffy',
      appointmentDate: '2025-09-20',
      appointmentTime: '2:00 PM',
      clientName: 'John Doe'
    });
    console.log('Result:', result3);

    // Test 4: Get notifications
    console.log('\n📝 Test 4: Fetching notifications...');
    const result4 = await NotificationService.getNotifications({
      userId: '1',
      limit: 10
    });
    console.log('Notifications found:', result4.data?.length || 0);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 To test real-time notifications:');
    console.log('1. Start the Next.js app: npm run dev');
    console.log('2. Start the WebSocket server: npm run ws');
    console.log('3. Login to the client portal');
    console.log('4. Run this script while logged in to see toast notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotificationSystem();
