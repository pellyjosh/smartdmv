// src/db/seedContacts.ts
import { db } from './index';
import { contacts, users, pets } from './schema';
import { sql } from 'drizzle-orm';

async function seedContacts() {
  try {
    console.log('🌱 Seeding sample contacts...');

    // Get some users and pets for the contacts
    const clientUsers = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, 'CLIENT'),
      limit: 3,
    });

    const allPets = await db.query.pets.findMany({
      limit: 5,
    });

    if (clientUsers.length === 0) {
      console.log('❌ No client users found. Please seed users first.');
      return;
    }

    const sampleContacts = [
      {
        senderId: clientUsers[0].id,
        practiceId: 1,
        petId: allPets[0]?.id || null,
        contactMethod: 'message',
        urgency: 'high',
        status: 'pending',
        subject: 'Urgent: My dog is vomiting',
        message: 'Hi, my dog Rex has been vomiting since this morning and seems very lethargic. I\'m very worried about him. Can someone please call me back as soon as possible?',
        phoneNumber: '(555) 123-4567',
        preferredTime: 'ASAP',
        isRead: false,
      },
      {
        senderId: clientUsers[1]?.id || clientUsers[0].id,
        practiceId: 1,
        petId: allPets[1]?.id || null,
        contactMethod: 'phone_call',
        urgency: 'medium',
        status: 'pending',
        subject: 'Appointment Scheduling Question',
        message: 'Hello, I need to schedule a routine checkup for my cat Whiskers. She\'s due for her annual vaccines. What times do you have available next week?',
        phoneNumber: '(555) 987-6543',
        preferredTime: 'Weekday mornings',
        isRead: false,
      },
      {
        senderId: clientUsers[2]?.id || clientUsers[0].id,
        practiceId: 1,
        petId: allPets[2]?.id || null,
        contactMethod: 'video_call',
        urgency: 'low',
        status: 'responded',
        subject: 'Follow-up on medication',
        message: 'Hi Dr. Smith, I wanted to follow up on the medication you prescribed for Buddy last week. He seems to be doing much better, but I have a few questions about the dosage.',
        phoneNumber: '(555) 456-7890',
        preferredTime: 'Evening hours',
        isRead: true,
        respondedAt: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        senderId: clientUsers[0].id,
        practiceId: 1,
        petId: null, // General inquiry
        contactMethod: 'message',
        urgency: 'low',
        status: 'pending',
        subject: 'Question about pet insurance',
        message: 'Hi, I\'m considering getting pet insurance for my pets. Do you have any recommendations for insurance companies that work well with your practice?',
        isRead: false,
      },
      {
        senderId: clientUsers[1]?.id || clientUsers[0].id,
        practiceId: 1,
        petId: allPets[3]?.id || null,
        contactMethod: 'phone_call',
        urgency: 'emergency',
        status: 'in_progress',
        subject: 'EMERGENCY: Dog hit by car',
        message: 'EMERGENCY! My dog was just hit by a car and is bleeding heavily. I\'m rushing to your clinic right now. Please prepare for emergency surgery!',
        phoneNumber: '(555) 111-2222',
        preferredTime: 'NOW',
        isRead: true,
      },
    ];

    for (const contact of sampleContacts) {
      const existing = await db.query.contacts.findFirst({
        where: (contacts, { and, eq }) => 
          and(
            eq(contacts.subject, contact.subject),
            eq(contacts.senderId, contact.senderId)
          ),
      });

      if (!existing) {
        await db.insert(contacts).values({
          ...contact,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
        });
        console.log(`✅ Created contact: ${contact.subject}`);
      } else {
        console.log(`⏭️ Contact already exists: ${contact.subject}`);
      }
    }

    console.log('🎉 Contacts seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding contacts:', error);
    throw error;
  }
}

seedContacts();
