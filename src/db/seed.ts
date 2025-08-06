import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

config(); // Load environment variables from .env file

import { db } from './index';
// Import all necessary schemas
import {
  practices,
  users,
  administratorAccessiblePractices,
  UserRoleEnum,
  customFieldCategories,
  customFieldGroups,
  customFieldValues,
  pets, // <--- Import pets schema
  appointments,
  healthPlans,
  notifications,
  referrals,
  ReferralStatus,
  ReferralPriority,
  VetSpecialty,
  prescriptions
} from './schema';
import { User } from '@/context/UserContext';
import { Phone } from 'lucide-react';
import { seedMarketplaceData } from './seedMarketplaceData';

// Prescription seeding function
async function seedPrescriptions() {
  console.log('🧪 Seeding prescription data...');
  
  const prescriptionsData = [
    {
      soapNoteId: 9,
      petId: "pet-1",
      practiceId: "practice-1",
      prescribedBy: "Dr. Sarah Johnson",
      inventoryItemId: "inv-antibiotics-001",
      medicationName: "Amoxicillin",
      dosage: "250mg",
      route: "oral" as const,
      frequency: "BID" as const,
      duration: "10 days",
      instructions: "Give with food. Complete entire course even if symptoms improve.",
      quantityPrescribed: 20,
      quantityDispensed: 20,
      refills: 0,
      refillsUsed: 0,
      status: "completed" as const,
      dateEnds: new Date('2025-08-15'), // 10 days from now
      lastDispensed: new Date('2025-08-05')
    },
    {
      soapNoteId: 9,
      petId: "pet-1", 
      practiceId: "practice-1",
      prescribedBy: "Dr. Sarah Johnson",
      inventoryItemId: "inv-pain-001",
      medicationName: "Carprofen",
      dosage: "75mg",
      route: "oral" as const,
      frequency: "once" as const,
      duration: "5 days",
      instructions: "Give in the morning with food. Monitor for appetite changes.",
      quantityPrescribed: 5,
      quantityDispensed: 5,
      refills: 0,
      refillsUsed: 0,
      status: "active" as const,
      dateEnds: new Date('2025-08-10'), // 5 days from now
      lastDispensed: new Date('2025-08-05')
    },
    {
      soapNoteId: 9,
      petId: "pet-1",
      practiceId: "practice-1", 
      prescribedBy: "Dr. Sarah Johnson",
      inventoryItemId: "inv-eye-drops-001",
      medicationName: "Terramycin Eye Ointment",
      dosage: "1 ribbon",
      route: "ophthalmic" as const,
      frequency: "BID" as const,
      duration: "7 days",
      instructions: "Apply thin ribbon to affected eye. Avoid contaminating tube tip.",
      quantityPrescribed: 1,
      quantityDispensed: 0,
      refills: 1,
      refillsUsed: 0,
      status: "active" as const,
      dateEnds: new Date('2025-08-12'), // 7 days from now
    }
  ];

  try {
    await db.insert(prescriptions).values(prescriptionsData);
    console.log(`✅ Inserted ${prescriptionsData.length} prescription records`);
  } catch (error) {
    console.error('❌ Error inserting prescription data:', error);
    throw error;
  }
}

async function seed() {
  console.log('🌱 Starting database seeding...');
  console.log(`Database type from env: ${process.env.DB_TYPE}`);

  const password = await bcrypt.hash("password", 10);

  const practicesData = [
    { id: 'practice_MAIN_HQ', name: 'Main HQ Vet Clinic' },
    { id: 'practice_NORTH', name: 'North Paws Clinic' },
    { id: 'practice_SOUTH', name: 'South Valley Vets' },
  ];

  const adminUserId = crypto.randomUUID();
  const practiceAdminUserId = crypto.randomUUID();
  const client1UserId = crypto.randomUUID(); // This client will own pets for practice_NORTH
  const client2UserId = crypto.randomUUID(); // This client will own pets for practice_SOUTH
  const vet1UserId = crypto.randomUUID(); // Veterinarian 1
  const vet2UserId = crypto.randomUUID(); // Veterinarian 2
  const vet3UserId = crypto.randomUUID(); // Veterinarian 3

  const usersData = [
    {
      id: adminUserId,
      email: 'admin@vetconnect.pro',
      username: 'superadmin',
      phone: '08101572723',
      address: '123, New Ave drive, Ikeja Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      name: 'Admin User',
      password: password,
      role: 'ADMINISTRATOR' as typeof UserRoleEnum.ADMINISTRATOR,
      practiceId: null,
      currentPracticeId: 'practice_MAIN_HQ',
    },
    {
      id: practiceAdminUserId,
      email: 'vet@vetconnect.pro',
      name: 'Dr. Vet PracticeAdmin',
      username: 'admin',
      phone: '08101572723',
      address: '123, New Ave drive, Ikeja Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      password: password,
      role: 'PRACTICE_ADMINISTRATOR' as typeof UserRoleEnum.PRACTICE_ADMINISTRATOR,
      practiceId: 'practice_MAIN_HQ',
      currentPracticeId: 'practice_MAIN_HQ',
    },
    {
      id: client1UserId,
      email: 'client@vetconnect.pro',
      name: 'Pet Owner Client',
      username: 'client1',
      phone: '08101572723',
      address: '123, New Ave drive, Ikeja Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      password: password,
      role: 'CLIENT' as typeof UserRoleEnum.CLIENT,
      practiceId: 'practice_MAIN_HQ',
      currentPracticeId: null,
    },
    {
      id: client2UserId,
      email: 'testclient@example.com',
      name: 'Test Client Example',
      username: 'client2',
      phone: '08101572723',
      address: '123, New Ave drive, Ikeja Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      password: password,
      role: 'CLIENT' as typeof UserRoleEnum.CLIENT,
      practiceId: 'practice_MAIN_HQ',
      currentPracticeId: null,
    },
    // Add veterinarians for referrals
    {
      id: vet1UserId,
      email: 'dr.smith@vetconnect.pro',
      name: 'Dr. John Smith',
      username: 'dr_smith',
      phone: '08101572724',
      address: '456, Vet Ave, Victoria Island Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      password: password,
      role: 'VETERINARIAN' as typeof UserRoleEnum.VETERINARIAN,
      practiceId: 'practice_MAIN_HQ',
      currentPracticeId: 'practice_MAIN_HQ',
    },
    {
      id: vet2UserId,
      email: 'dr.jones@northpaws.com',
      name: 'Dr. Emily Jones',
      username: 'dr_jones',
      phone: '08101572725',
      address: '789, North St, Ikeja Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      password: password,
      role: 'VETERINARIAN' as typeof UserRoleEnum.VETERINARIAN,
      practiceId: 'practice_NORTH',
      currentPracticeId: 'practice_NORTH',
    },
    {
      id: vet3UserId,
      email: 'dr.wilson@southvalley.com',
      name: 'Dr. Sarah Wilson',
      username: 'dr_wilson',
      phone: '08101572726',
      address: '321, South Valley Rd, Ikoyi Lagos',
      state: 'Lagos',
      zip_code: '123456',
      country: 'Nigeria',
      password: password,
      role: 'VETERINARIAN' as typeof UserRoleEnum.VETERINARIAN,
      practiceId: 'practice_SOUTH',
      currentPracticeId: 'practice_SOUTH',
    },
  ];

  const adminAccessData = [
    { administratorId: adminUserId, practiceId: 'practice_MAIN_HQ' },
    { administratorId: adminUserId, practiceId: 'practice_NORTH' },
    { administratorId: adminUserId, practiceId: 'practice_SOUTH' },
  ];

  let appointmentCategoryId: number | undefined;
  let appointmentTypeId: number | undefined;

  const customFieldCategoriesData = [
    { practiceId: 'practice_MAIN_HQ', name: 'Appointments', description: 'Categories for appointment-related custom fields' },
  ];

  // --- New Pets Data ---
  const pet1Id = crypto.randomUUID();
  const pet2Id = crypto.randomUUID();
  const pet3Id = crypto.randomUUID();
  
  const petsData = [
    {
      id: pet1Id,
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      dateOfBirth: new Date('2020-05-15'), // Example Date object
      ownerId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
      weight: '25 kg',
      gender: 'Male',
      allergies: 'None known',
      color: 'Golden',
    },
    {
      id: pet2Id,
      name: 'Whiskers',
      species: 'Cat',
      breed: 'Siamese',
      dateOfBirth: new Date('2021-02-28'),
      ownerId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
      weight: '4 kg',
      gender: 'Female',
      allergies: 'Fish',
      color: 'Cream and brown',
    },
    {
      id: pet3Id,
      name: 'Captain Fluff',
      species: 'Guinea Pig',
      breed: null,
      dateOfBirth: new Date('2023-01-10'),
      ownerId: client2UserId,
      practiceId: 'practice_MAIN_HQ',
      weight: '0.8 kg',
      gender: 'Male',
      allergies: null,
      color: 'White and brown',
    },
  ];

  // --- Sample Appointments Data ---
  const appointmentsData = [
    {
      id: crypto.randomUUID(),
      title: 'Annual Checkup - Buddy',
      description: 'Routine annual health examination',
      date: new Date('2025-08-12'), // 1 week from now
      durationMinutes: '45',
      status: 'approved' as const,
      petId: pet1Id,
      clientId: client1UserId,
      practitionerId: vet1UserId,
      practiceId: 'practice_MAIN_HQ',
    },
    {
      id: crypto.randomUUID(),
      title: 'Vaccination Update - Whiskers',
      description: 'Annual vaccinations',
      date: new Date('2025-08-19'), // 2 weeks from now
      durationMinutes: '30',
      status: 'approved' as const,
      petId: pet2Id,
      clientId: client1UserId,
      practitionerId: vet1UserId,
      practiceId: 'practice_MAIN_HQ',
    },
    {
      id: crypto.randomUUID(),
      title: 'Health Check - Captain Fluff',
      description: 'General health examination',
      date: new Date('2024-07-05'), // 1 month ago (completed)
      durationMinutes: '30',
      status: 'approved' as const,
      petId: pet3Id,
      clientId: client2UserId,
      practitionerId: vet1UserId,
      practiceId: 'practice_MAIN_HQ',
    },
  ];

  // --- Sample Health Plans Data ---
  const healthPlansData = [
    {
      id: crypto.randomUUID(),
      name: 'Senior Dog Wellness Plan',
      petId: pet1Id,
      practiceId: 'practice_MAIN_HQ',
      planType: 'Senior Care',
      description: 'Comprehensive wellness plan for senior dogs including regular checkups, dental care, and joint health monitoring.',
      status: 'active' as const,
      startDate: new Date('2024-06-01'), // 2 months ago
      endDate: new Date('2025-04-01'), // 10 months from now
    },
    {
      id: crypto.randomUUID(),
      name: 'Cat Preventive Care',
      petId: pet2Id,
      practiceId: 'practice_MAIN_HQ',
      planType: 'Preventive Care',
      description: 'Regular preventive care including vaccinations, flea/tick prevention, and annual checkups.',
      status: 'active' as const,
      startDate: new Date('2024-07-01'), // 1 month ago
      endDate: new Date('2025-06-01'), // 11 months from now
    },
  ];

  // --- Sample Notifications Data ---
  const notificationsData = [
    {
      id: crypto.randomUUID(),
      userId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
      title: 'Appointment Reminder',
      message: 'Buddy has an appointment scheduled for next week on Monday at 10:00 AM.',
      type: 'appointment' as const,
      read: false,
      relatedId: null,
      relatedType: 'appointment',
      link: '/client?tab=appointments',
    },
    {
      id: crypto.randomUUID(),
      userId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
      title: 'Vaccination Due',
      message: 'Whiskers is due for annual vaccinations. Please schedule an appointment.',
      type: 'health_plan' as const,
      read: false,
      relatedId: null,
      relatedType: 'health_plan',
      link: '/client?tab=health-plans',
    },
    {
      id: crypto.randomUUID(),
      userId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
      title: 'Welcome to SmartDVM',
      message: 'Welcome to our client portal! You can now view your pets health records, schedule appointments, and more.',
      type: 'info' as const,
      read: true,
      relatedId: null,
      relatedType: null,
      link: '/client',
    },
    {
      id: crypto.randomUUID(),
      userId: client2UserId,
      practiceId: 'practice_MAIN_HQ',
      title: 'Health Plan Update',
      message: 'Captain Fluff has been enrolled in our Small Pet Care plan.',
      type: 'health_plan' as const,
      read: false,
      relatedId: null,
      relatedType: 'health_plan',
      link: '/client?tab=health-plans',
    },
  ];

  console.log('🗑️ Clearing existing data...');
  try {
    // ORDER IS CRUCIAL DUE TO FOREIGN KEY CONSTRAINTS
    // Delete tables that depend on others first
    // (e.g., appointments, healthPlans, whiteboardItems would depend on pets/users)
    // For simplicity, we are deleting pets before users/practices here,
    // assuming no direct foreign keys from pets to those yet, or cascade is handled.
    // If you add appointments later, they must be deleted BEFORE pets.
    
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(notifications);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(healthPlans);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(appointments);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(customFieldValues);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(customFieldGroups);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(customFieldCategories);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(pets); // <--- Add pets to deletion order
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(administratorAccessiblePractices);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(users);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.delete(practices);
    console.log('✅ Existing data cleared.');
  } catch (error) {
    console.error('⚠️ Error clearing data (might be okay if tables are empty or FKs are deferred):', error);
  }

  console.log('Inserting practices...');
  try {
    await db.insert(practices).values(practicesData);
    console.log(`✅ Inserted ${practicesData.length} practices.`);
  } catch (error) {
    console.error('❌ Error inserting practices:', error);
    throw error;
  }

  // Generate typed users data by ensuring required fields are present
  const typedUsersData = usersData.map(user => ({
    ...user,
    companyId: 'default-company-id' // Add default company ID if required
  }));

  console.log('Inserting users...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.insert(users).values(typedUsersData);
    console.log(`✅ Inserted ${typedUsersData.length} users.`);
  } catch (error) {
    console.error('❌ Error inserting users:', error);
    throw error;
  }

  console.log('Inserting administrator accessible practices...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.insert(administratorAccessiblePractices).values(adminAccessData);
    console.log(`✅ Inserted ${adminAccessData.length} admin access records.`);
  } catch (error) {
    console.error('❌ Error inserting admin access:', error);
    throw error;
  }

  // --- Insert Pets (after users and practices, as pets depend on them) ---
  console.log('Inserting pets...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.insert(pets).values(petsData);
    console.log(`✅ Inserted ${petsData.length} pets.`);
  } catch (error) {
    console.error('❌ Error inserting pets:', error);
    throw error;
  }

  // --- Custom Fields Seeding ---

    // --- Custom Fields Seeding ---
  console.log('Inserting custom field categories...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const insertedCategories = await db.insert(customFieldCategories).values(customFieldCategoriesData).returning({ id: customFieldCategories.id });
    if (insertedCategories.length > 0) {
      appointmentCategoryId = insertedCategories[0].id;
      console.log(`✅ Inserted ${insertedCategories.length} custom field categories. First ID: ${appointmentCategoryId}`);
    } else {
      console.warn('⚠️ No categories were inserted or ID was not returned.');
    }
  } catch (error) {
    console.error('❌ Error inserting custom field categories:', error);
    throw error;
  }

  if (appointmentCategoryId) {
    const customFieldGroupsData = [
      { categoryId: appointmentCategoryId, practiceId: 'practice_MAIN_HQ', name: 'Appointment Types', key: 'appointment_types', description: 'Types of appointments available' },
    ];

    console.log('Inserting custom field groups...');
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const insertedGroups = await db.insert(customFieldGroups).values(customFieldGroupsData).returning({ id: customFieldGroups.id });
      if (insertedGroups.length > 0) {
        appointmentTypeId = insertedGroups[0].id;
        console.log(`✅ Inserted ${insertedGroups.length} custom field groups. First ID: ${appointmentTypeId}`);
      } else {
        console.warn('⚠️ No groups were inserted or ID was not returned.');
      }
    } catch (error) {
      console.error('❌ Error inserting custom field groups:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Skipping custom field group insertion: No category ID available.');
  }

  if (appointmentTypeId) {
    const customFieldValuesData = [
      { groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'virtual', label: 'Virtual Consultation', isActive: 1 },
      { groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'in-person', label: 'In-Person Visit', isActive: 1 },
      { groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'emergency', label: 'Emergency Visit', isActive: 1 },
      { groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'follow-up', label: 'Follow-up Check', isActive: 1 },
      { groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'surgery', label: 'Surgery Consultation', isActive: 0 },
    ];

    console.log('Inserting custom field values...');
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await db.insert(customFieldValues).values(customFieldValuesData);
      console.log(`✅ Inserted ${customFieldValuesData.length} custom field values.`);
    } catch (error) {
      console.error('❌ Error inserting custom field values:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Skipping custom field value insertion: No group ID available.');
  }

  // --- Insert Sample Appointments ---
  console.log('Inserting sample appointments...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.insert(appointments).values(appointmentsData);
    console.log(`✅ Inserted ${appointmentsData.length} sample appointments.`);
  } catch (error) {
    console.error('❌ Error inserting sample appointments:', error);
    throw error;
  }

  // --- Insert Sample Health Plans ---
  console.log('Inserting sample health plans...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.insert(healthPlans).values(healthPlansData);
    console.log(`✅ Inserted ${healthPlansData.length} sample health plans.`);
  } catch (error) {
    console.error('❌ Error inserting sample health plans:', error);
    throw error;
  }

  // --- Insert Sample Notifications ---
  console.log('Temporarily skipping notifications due to schema mismatch...');
  console.log('⏭️ Skipping notifications insertion for now.');

  // TODO: Fix notifications schema mismatch between Drizzle schema and actual database

  // Temporarily skip marketplace data due to schema mismatch
  console.log('Temporarily skipping marketplace due to schema mismatch...');
  console.log('⏭️ Skipping marketplace insertion for now.');
  // TODO: Fix marketplace schema mismatch between Drizzle schema and actual database
  // try {
  //   await seedMarketplaceData();
  // } catch (error) {
  //   console.error('❌ Error seeding marketplace data:', error);
  //   throw error;
  // }

  // Temporarily skip prescriptions data due to schema mismatch
  console.log('Temporarily skipping prescriptions due to schema mismatch...');
  console.log('⏭️ Skipping prescriptions insertion for now.');
  // TODO: Fix prescriptions schema mismatch between Drizzle schema and actual database
  // try {
  //   await seedPrescriptions();
  // } catch (error) {
  //   console.error('❌ Error seeding prescriptions data:', error);
  //   throw error;
  // }

  console.log('🌳 Database seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Database seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('🌱 Seeder script finished.');
  });