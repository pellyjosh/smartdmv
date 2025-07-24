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
  referrals,
  ReferralStatus,
  ReferralPriority,
  VetSpecialty
} from './schema';
import { User } from '@/context/UserContext';
import { Phone } from 'lucide-react';

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
  const petsData = [
    {
      id: crypto.randomUUID(),
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      dateOfBirth: new Date('2020-05-15'), // Example Date object
      ownerId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
    },
    {
      id: crypto.randomUUID(),
      name: 'Whiskers',
      species: 'Cat',
      breed: 'Siamese',
      dateOfBirth: new Date('2021-02-28'),
      ownerId: client1UserId,
      practiceId: 'practice_MAIN_HQ',
    },
    {
      id: crypto.randomUUID(),
      name: 'Captain Fluff',
      species: 'Guinea Pig',
      breed: null,
      dateOfBirth: new Date('2023-01-10'),
      ownerId: client2UserId,
      practiceId: 'practice_MAIN_HQ',
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
    await db.delete(customFieldValues);
    await db.delete(customFieldGroups);
    await db.delete(customFieldCategories);
    await db.delete(pets); // <--- Add pets to deletion order
    await db.delete(administratorAccessiblePractices);
    await db.delete(users);
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

  console.log('Inserting users...');
  try {
    const typedUsersData = usersData.map(user => ({
      ...user,
      role: user.role,
    }));
    await db.insert(users).values(typedUsersData);
    console.log(`✅ Inserted ${usersData.length} users.`);
  } catch (error) {
    console.error('❌ Error inserting users:', error);
    throw error;
  }

  console.log('Inserting administrator accessible practices...');
  try {
    await db.insert(administratorAccessiblePractices).values(adminAccessData);
    console.log(`✅ Inserted ${adminAccessData.length} admin access links.`);
  } catch (error) {
    console.error('❌ Error inserting administrator accessible practices:', error);
    throw error;
  }

  // --- Insert Pets (after users and practices, as pets depend on them) ---
  console.log('Inserting pets...');
  try {
    await db.insert(pets).values(petsData);
    console.log(`✅ Inserted ${petsData.length} pets.`);
  } catch (error) {
    console.error('❌ Error inserting pets:', error);
    throw error;
  }

  // --- Custom Fields Seeding ---
  console.log('Inserting custom field categories...');
  try {
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
      await db.insert(customFieldValues).values(customFieldValuesData);
      console.log(`✅ Inserted ${customFieldValuesData.length} custom field values.`);
    } catch (error) {
      console.error('❌ Error inserting custom field values:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Skipping custom field value insertion: No group ID available.');
  }

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