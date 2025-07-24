// Seed notifications data for testing the dashboard widget
import { db } from './index';
import { notifications } from './schema';
import { sql } from 'drizzle-orm';

export async function seedNotificationsData() {
  console.log('🔔 Seeding notifications data...');

  try {
    // Get current time and create notifications for recent activity
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).getTime();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).getTime();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).getTime();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).getTime();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).getTime();

    // Add some sample notifications using existing user IDs
    const notificationsData = [
      {
        id: 'notif_1',
        userId: '98deb294-73f4-4dd8-8fc0-45c8cd833a5d', // Pet Owner Client
        practiceId: 'practice_MAIN_HQ',
        title: 'Appointment Confirmation',
        message: 'Your appointment for Buddy has been confirmed for today at 2:00 PM.',
        type: 'appointment',
        read: false,
        relatedId: 'appt_1',
        relatedType: 'appointment',
        link: '/appointments',
        createdAt: oneHourAgo,
        updatedAt: oneHourAgo,
      },
      {
        id: 'notif_2',
        userId: '455f5680-b1ec-4420-a915-1541764ae3af', // Dr. Vet PracticeAdmin
        practiceId: 'practice_MAIN_HQ',
        title: 'New Appointment Request',
        message: 'A new appointment request has been submitted for Captain Fluff.',
        type: 'appointment',
        read: false,
        relatedId: 'appt_3',
        relatedType: 'appointment',
        link: '/admin/appointments',
        createdAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
      },
      {
        id: 'notif_3',
        userId: '9d6882be-46fe-4bf7-a695-7c1dcf0c2bc9', // Test Client Example
        practiceId: 'practice_MAIN_HQ',
        title: 'Vaccination Reminder',
        message: 'Whiskers is due for annual vaccinations. Please schedule an appointment.',
        type: 'reminder',
        read: false,
        relatedId: null,
        relatedType: 'pet',
        link: '/appointments/new',
        createdAt: sixHoursAgo,
        updatedAt: sixHoursAgo,
      },
      {
        id: 'notif_4',
        userId: 'cf934dfe-151a-4462-8162-8c16fdd30567', // Dr. John Smith
        practiceId: 'practice_MAIN_HQ',
        title: 'Lab Results Available',
        message: 'Lab results for Buddy are now available for review.',
        type: 'alert',
        read: true,
        relatedId: null,
        relatedType: 'lab_result',
        link: '/lab/results',
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo,
      },
      {
        id: 'notif_5',
        userId: '98deb294-73f4-4dd8-8fc0-45c8cd833a5d', // Pet Owner Client
        practiceId: 'practice_MAIN_HQ',
        title: 'System Maintenance',
        message: 'The system will undergo maintenance tonight from 11 PM to 1 AM.',
        type: 'system',
        read: false,
        relatedId: null,
        relatedType: 'system',
        link: null,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'notif_6',
        userId: '455f5680-b1ec-4420-a915-1541764ae3af', // Dr. Vet PracticeAdmin
        practiceId: 'practice_MAIN_HQ',
        title: 'New Message',
        message: 'You have received a new message from a client regarding their pet\'s condition.',
        type: 'message',
        read: false,
        relatedId: null,
        relatedType: 'message',
        link: '/messages',
        createdAt: oneHourAgo + 30 * 60 * 1000, // 30 minutes after oneHourAgo
        updatedAt: oneHourAgo + 30 * 60 * 1000,
      }
    ];

    // Insert notifications data using execute method
    for (const notification of notificationsData) {
      await db.execute(sql`
        INSERT INTO notifications (id, user_id, practice_id, title, message, type, read, related_id, related_type, link, created_at, updated_at)
        VALUES (${notification.id}, ${notification.userId}, ${notification.practiceId}, ${notification.title}, ${notification.message}, ${notification.type}, ${notification.read ? 1 : 0}, ${notification.relatedId}, ${notification.relatedType}, ${notification.link}, ${notification.createdAt}, ${notification.updatedAt})
      `);
    }
    
    console.log(`✅ Successfully seeded ${notificationsData.length} notifications`);
    
  } catch (error) {
    console.error('❌ Error seeding notifications data:', error);
    throw error;
  }
}

// Run this function independently if needed
if (require.main === module) {
  seedNotificationsData()
    .then(() => {
      console.log('✅ Notifications seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Notifications seeding failed:', error);
      process.exit(1);
    });
}
