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

async function seed() {
  console.log('🌱 Starting database seeding for PostgreSQL...');

  const password = await bcrypt.hash("password", 10);

  // Step 1: Seed practices first (they don't have dependencies)
  console.log('🏥 Seeding practices...');
  const practicesData = [
    { name: 'Main HQ Vet Clinic' },
    { name: 'North Paws Clinic' },
    { name: 'South Valley Vets' },
  ];

  const insertedPractices = await insertWithReturning(practices, practicesData, 'practices', { id: practices.id, name: practices.name });
  const [practice1, practice2, practice3] = insertedPractices;

  // Step 2: Seed users with references to practices
  console.log('👥 Seeding users...');
  const usersData = [
    {
      email: 'admin@vetconnect.pro',
      username: 'admin',
      name: 'Super Admin',
      password: password,
      phone: '+1-555-0001',
      role: UserRoleEnum.SUPER_ADMIN,
      practiceId: practice1.id,
      currentPracticeId: practice1.id,
    },
    {
      email: 'vet@vetconnect.pro',
      username: 'practiceadmin',
      name: 'Practice Admin',
      password: password,
      phone: '+1-555-0002',
      role: UserRoleEnum.PRACTICE_ADMINISTRATOR,
      practiceId: practice1.id,
      currentPracticeId: practice1.id,
    },
    {
      email: 'client@vetconnect.pro',
      username: 'client1',
      name: 'John Smith',
      password: password,
      phone: '+1-555-0003',
      role: UserRoleEnum.CLIENT,
      practiceId: practice1.id,
      currentPracticeId: practice1.id,
    },
    {
      email: 'testclient@example.com',
      username: 'testclient',
      name: 'Jane Doe',
      password: password,
      phone: '+1-555-0004',
      role: UserRoleEnum.CLIENT,
      practiceId: practice2.id,
      currentPracticeId: practice2.id,
    },
    {
      email: 'dr.smith@vetconnect.pro',
      username: 'drsmith',
      name: 'Dr. Sarah Johnson',
      password: password,
      phone: '+1-555-0005',
      role: UserRoleEnum.VETERINARIAN,
      practiceId: practice1.id,
      currentPracticeId: practice1.id,
    },
    {
      email: 'dr.jones@northpaws.com',
      username: 'drjones',
      name: 'Dr. Michael Jones',
      password: password,
      phone: '+1-555-0006',
      role: UserRoleEnum.VETERINARIAN,
      practiceId: practice2.id,
      currentPracticeId: practice2.id,
    },
    {
      email: 'dr.wilson@southvalley.com',
      username: 'drwilson',
      name: 'Dr. Emily Wilson',
      password: password,
      phone: '+1-555-0007',
      role: UserRoleEnum.VETERINARIAN,
      practiceId: practice3.id,
      currentPracticeId: practice3.id,
    },
  ];

  const insertedUsers = await insertWithReturning(users, usersData, 'users', { id: users.id, email: users.email, role: users.role });
  const [adminUser, practiceAdminUser, client1User, client2User, vet1User, vet2User, vet3User] = insertedUsers;

  // Step 3: Seed pets with references to users and practices
  console.log('🐕 Seeding pets...');
  const petsData = [
    {
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      dateOfBirth: new Date('2020-05-15'),
      ownerId: client1User.id,
      practiceId: practice1.id,
      weight: '30kg',
      color: 'Golden',
      gender: 'Male',
    },
    {
      name: 'Whiskers',
      species: 'Cat',
      breed: 'Persian',
      dateOfBirth: new Date('2019-08-22'),
      ownerId: client1User.id,
      practiceId: practice1.id,
      weight: '4kg',
      color: 'White',
      gender: 'Female',
    },
    {
      name: 'Charlie',
      species: 'Dog',
      breed: 'Labrador',
      dateOfBirth: new Date('2021-03-10'),
      ownerId: client2User.id,
      practiceId: practice2.id,
      weight: '25kg',
      color: 'Black',
      gender: 'Male',
    },
  ];

  const insertedPets = await insertWithReturning(pets, petsData, 'pets', { id: pets.id, name: pets.name, ownerId: pets.ownerId });
  const [pet1, pet2, pet3] = insertedPets;

  // Step 4: Seed appointments
  console.log('📅 Seeding appointments...');
  const appointmentsData = [
    {
      title: 'Annual Checkup',
      description: 'Routine annual health examination',
      date: new Date('2025-08-15T10:00:00Z'),
      durationMinutes: '30',
      status: 'pending' as const,
      petId: pet1.id,
      clientId: client1User.id,
      practitionerId: vet1User.id,
      practiceId: practice1.id,
    },
    {
      title: 'Vaccination',
      description: 'Annual vaccinations due',
      date: new Date('2025-08-20T14:00:00Z'),
      durationMinutes: '15',
      status: 'approved' as const,
      petId: pet2.id,
      clientId: client1User.id,
      practitionerId: vet1User.id,
      practiceId: practice1.id,
    },
    {
      title: 'Follow-up Exam',
      description: 'Post-surgery follow-up',
      date: new Date('2025-08-25T09:00:00Z'),
      durationMinutes: '45',
      status: 'approved' as const,
      petId: pet3.id,
      clientId: client2User.id,
      practitionerId: vet2User.id,
      practiceId: practice2.id,
    },
  ];

  await insertBatch(appointments, appointmentsData, 'appointments');

  // Step 5: Seed health plans
  console.log('🏥 Seeding health plans...');
  const healthPlansData = [
    {
      name: 'Basic Wellness Plan',
      petId: pet1.id,
      practiceId: practice1.id,
      planType: 'Wellness',
      description: 'Basic wellness coverage including annual exams and vaccinations',
      status: 'active' as const,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
    {
      name: 'Senior Care Plan',
      petId: pet2.id,
      practiceId: practice1.id,
      planType: 'Senior Care',
      description: 'Comprehensive care plan for senior pets',
      status: 'active' as const,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
  ];

  await insertBatch(healthPlans, healthPlansData, 'health_plans');

  // Step 6: Seed notifications
  console.log('🔔 Seeding notifications...');
  const notificationsData = [
    {
      userId: client1User.id,
      practiceId: practice1.id,
      type: 'appointment' as const,
      title: 'Appointment Reminder',
      message: 'Buddy has an appointment tomorrow at 10:00 AM',
      isRead: false,
      priority: 'medium' as const,
    },
    {
      userId: vet1User.id,
      practiceId: practice1.id,
      type: 'system' as const,
      title: 'New Appointment',
      message: 'New appointment scheduled with Buddy',
      isRead: false,
      priority: 'high' as const,
    },
  ];

  await insertBatch(notifications, notificationsData, 'notifications');

  // Step 7: Seed custom fields
  console.log('🔧 Seeding custom fields...');
  const customFieldCategoriesData = [
    {
      name: 'Pet Information',
      description: 'Additional pet-specific information',
      practiceId: practice1.id,
    },
    {
      name: 'Medical History',
      description: 'Medical history tracking',
      practiceId: practice1.id,
    },
  ];

  const insertedCategories = await insertWithReturning(customFieldCategories, customFieldCategoriesData, 'custom_field_categories', { 
    id: customFieldCategories.id, 
    name: customFieldCategories.name 
  });

  // Step 8: Seed marketplace data
  console.log('🏪 Seeding marketplace data...');
  await seedMarketplaceData();

  console.log('✅ Database seeding completed successfully!');
  console.log(`
📊 Seeding Summary:
  - ${insertedPractices.length} practices
  - ${insertedUsers.length} users
  - ${insertedPets.length} pets
  - ${appointmentsData.length} appointments
  - ${healthPlansData.length} health plans
  - ${notificationsData.length} notifications
  - ${insertedCategories.length} custom field categories
  `);
}

// Run the seed function
seed()
  .then(() => {
    console.log('🎉 Seeding process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });

export { seed };
