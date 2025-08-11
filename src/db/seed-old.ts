import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

config(); // Load environment variables from .env file

import { db } from './index';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
// Import all necessary schemas
import {
  practices,
  users,
  administratorAccessiblePractices,
  UserRoleEnum,
  customFieldCategories,
  customFieldGroups,
  customFieldValues,
  pets,
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
import { seedMarketplaceData } from './seedMarketplaceData';

// PostgreSQL-only database operations
const pgDb = db as NeonHttpDatabase<typeof import('./schema')>;

// Type-safe database operations for PostgreSQL
async function insertWithUpsert<T>(table: any, data: T[], tableName: string) {
  console.log(`Upserting ${tableName}...`);
  let successCount = 0;
  let skipCount = 0;

  for (const item of data) {
    try {
      await pgDb.insert(table).values(item as any);
      successCount++;
    } catch (error: any) {
      // Handle duplicate key errors (PostgreSQL: 23505)
      if (error.code === '23505') {
        console.log(`${tableName} item already exists, skipping...`);
        skipCount++;
      } else {
        console.error(`❌ Error inserting ${tableName}:`, error);
        throw error;
      }
    }
  }
  
  console.log(`✅ Upserted ${tableName}: ${successCount} inserted, ${skipCount} skipped.`);
  return successCount;
}

async function insertBatch<T>(table: any, data: T[], tableName: string) {
  console.log(`Inserting ${tableName}...`);
  try {
    await pgDb.insert(table).values(data as any);
    console.log(`✅ Inserted ${data.length} ${tableName} records.`);
  } catch (error) {
    console.error(`❌ Error inserting ${tableName}:`, error);
    throw error;
  }
}

async function insertWithReturning<T>(table: any, data: T[], tableName: string, returning: any) {
  console.log(`Inserting ${tableName}...`);
  try {
    return await pgDb.insert(table).values(data as any).returning(returning);
  } catch (error) {
    console.error(`❌ Error inserting ${tableName}:`, error);
    throw error;
  }
}

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
    await insertBatch(prescriptions, prescriptionsData, 'prescriptions');
  } catch (error) {
    console.error('❌ Error inserting prescription data:', error);
    throw error;
  }
}

async function seed() {
  console.log('🌱 Starting database seeding for PostgreSQL...');

  const password = await bcrypt.hash("password", 10);

  // Seed practices first (they don't have dependencies)
  const practicesData = [
    { name: 'Main HQ Vet Clinic' },
    { name: 'North Paws Clinic' },
    { name: 'South Valley Vets' },
  ];

  const insertedPractices = await insertWithReturning(practices, practicesData, 'practices', { id: practices.id, name: practices.name });
  const [practice1, practice2, practice3] = insertedPractices;
      // For SQLite, generate new UUIDs
      adminUserId = crypto.randomUUID();
      practiceAdminUserId = crypto.randomUUID();
      client1UserId = crypto.randomUUID();
      client2UserId = crypto.randomUUID();
      vet1UserId = crypto.randomUUID();
      vet2UserId = crypto.randomUUID();
      vet3UserId = crypto.randomUUID();
    }
  } catch (error) {
    console.log('⚠️ Could not query users, using new UUIDs');
    adminUserId = crypto.randomUUID();
    practiceAdminUserId = crypto.randomUUID();
    client1UserId = crypto.randomUUID();
    client2UserId = crypto.randomUUID();
    vet1UserId = crypto.randomUUID();
    vet2UserId = crypto.randomUUID();
    vet3UserId = crypto.randomUUID();
  }

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
    { id: 1, practiceId: 'practice_MAIN_HQ', name: 'Appointments', description: 'Categories for appointment-related custom fields' },
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

  console.log('� Using upsert strategy to handle existing data...');

  await insertWithUpsert(practices, practicesData, 'practices');

  // Generate typed users data by ensuring required fields are present
  const typedUsersData = usersData.map(user => ({
    ...user,
    companyId: 'default-company-id' // Add default company ID if required
  }));

  await insertWithUpsert(users, typedUsersData, 'users');

  await insertWithUpsert(administratorAccessiblePractices, adminAccessData, 'administrator_accessible_practices');

  await insertWithUpsert(pets, petsData, 'pets');

  // --- Custom Fields Seeding ---
  console.log('Upserting custom field categories...');
  try {
    await insertWithUpsert(customFieldCategories, customFieldCategoriesData, 'custom_field_categories');
    // Since we're using explicit IDs, we know the category ID
    appointmentCategoryId = 1;
    console.log(`✅ Custom field categories upserted. Using category ID: ${appointmentCategoryId}`);
  } catch (error) {
    console.error('❌ Error upserting custom field categories:', error);
    throw error;
  }

  if (appointmentCategoryId) {
    const customFieldGroupsData = [
      { id: 1, categoryId: appointmentCategoryId, practiceId: 'practice_MAIN_HQ', name: 'Appointment Types', key: 'appointment_types', description: 'Types of appointments available' },
    ];

    console.log('Upserting custom field groups...');
    try {
      await insertWithUpsert(customFieldGroups, customFieldGroupsData, 'custom_field_groups');
      // Since we're using explicit IDs, we know the group ID
      appointmentTypeId = 1;
      console.log(`✅ Custom field groups upserted. Using group ID: ${appointmentTypeId}`);
    } catch (error) {
      console.error('❌ Error upserting custom field groups:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Skipping custom field group insertion: No category ID available.');
  }

  if (appointmentTypeId) {
    const customFieldValuesData = [
      { id: 1, groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'virtual', label: 'Virtual Consultation', isActive: 1 },
      { id: 2, groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'in-person', label: 'In-Person Visit', isActive: 1 },
      { id: 3, groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'emergency', label: 'Emergency Visit', isActive: 1 },
      { id: 4, groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'follow-up', label: 'Follow-up Check', isActive: 1 },
      { id: 5, groupId: appointmentTypeId, practiceId: 'practice_MAIN_HQ', value: 'surgery', label: 'Surgery Consultation', isActive: 0 },
    ];

    console.log('Upserting custom field values...');
    try {
      await insertWithUpsert(customFieldValues, customFieldValuesData, 'custom_field_values');
    } catch (error) {
      console.error('❌ Error upserting custom field values:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Skipping custom field value insertion: No group ID available.');
  }

  // --- Insert Sample Appointments ---
  console.log('Inserting sample appointments...');
  try {
    await insertBatch(appointments, appointmentsData, 'appointments');
  } catch (error) {
    console.error('❌ Error inserting sample appointments:', error);
    throw error;
  }

  // --- Insert Sample Health Plans ---
  console.log('Inserting sample health plans...');
  try {
    await insertBatch(healthPlans, healthPlansData, 'health_plans');
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