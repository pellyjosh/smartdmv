#!/usr/bin/env tsx
/**
 * Seed Tenant Database Script
 * Seeds various types of data (health plans, appointments, SOAP notes, etc.) 
 * into any chosen tenant database
 */
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/db/owner-schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as schema from '@/db/schema';

// Import all the schemas we'll be seeding
const {
  practices,
  users: usersSchema,
  pets,
  appointments,
  healthPlans,
  healthPlanMilestones,
  healthPlanNotes,
  soapNotes,
  prescriptions,
  treatments,
  vaccinations,
  vaccineTypes,
  referrals,
  notifications,
  inventory,
  billingPlans,
  customFieldCategories,
  customFieldGroups,
  customFields,
  customFieldValues,
  healthResources,
  contacts,
  administratorAccessiblePractices
} = schema;

interface SeedOptions {
  healthPlans?: number;
  appointments?: number;
  soapNotes?: number;
  prescriptions?: number;
  vaccinations?: number;
  referrals?: number;
  notifications?: number;
  inventoryItems?: number;
  healthResources?: number;
  contacts?: number;
  all?: boolean;
  clear?: boolean;
}

const DEFAULT_COUNTS: Required<Omit<SeedOptions, 'all' | 'clear'>> = {
  healthPlans: 5,
  appointments: 10,
  soapNotes: 15,
  prescriptions: 8,
  vaccinations: 6,
  referrals: 4,
  notifications: 12,
  inventoryItems: 20,
  healthResources: 15,
  contacts: 8,
};

async function seedTenantData() {
  const args = process.argv.slice(2);
  const tenantSlug = args[0];
  
  if (!tenantSlug) {
    console.log(`🌱 Seed Tenant Database`);
    console.log(`Usage: npm run db:tenant:seed -- <tenant-slug> [options]`);
    console.log(`Example: npm run db:tenant:seed -- smartvet --health-plans=5 --appointments=10`);
    console.log(`Options:`);
    console.log(`  --health-plans=N     Seed N health plans (default: ${DEFAULT_COUNTS.healthPlans})`);
    console.log(`  --appointments=N     Seed N appointments (default: ${DEFAULT_COUNTS.appointments})`);
    console.log(`  --soap-notes=N       Seed N SOAP notes (default: ${DEFAULT_COUNTS.soapNotes})`);
    console.log(`  --prescriptions=N    Seed N prescriptions (default: ${DEFAULT_COUNTS.prescriptions})`);
    console.log(`  --vaccinations=N     Seed N vaccinations (default: ${DEFAULT_COUNTS.vaccinations})`);
    console.log(`  --referrals=N        Seed N referrals (default: ${DEFAULT_COUNTS.referrals})`);
    console.log(`  --notifications=N    Seed N notifications (default: ${DEFAULT_COUNTS.notifications})`);
    console.log(`  --inventory-items=N  Seed N inventory items (default: ${DEFAULT_COUNTS.inventoryItems})`);
    console.log(`  --health-resources=N Seed N health resources (default: ${DEFAULT_COUNTS.healthResources})`);
    console.log(`  --contacts=N         Seed N contacts (default: ${DEFAULT_COUNTS.contacts})`);
    console.log(`  --all                Seed all data types with default counts`);
    console.log(`  --clear              Clear existing data before seeding (DANGEROUS!)`);
    process.exit(1);
  }

  // Parse options
  const options: SeedOptions = {};

  args.slice(1).forEach(arg => {
    if (arg === '--all') {
      options.all = true;
      // When --all is specified, use default counts
      Object.assign(options, DEFAULT_COUNTS);
    } else if (arg === '--clear') {
      options.clear = true;
    } else if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      const normalizedKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      if (normalizedKey in DEFAULT_COUNTS && value) {
        (options as any)[normalizedKey] = parseInt(value, 10);
      }
    }
  });

  console.log(`🔧 Options after parsing:`, options);

  // If no specific seeding options and no --all, default to all types
  const hasAnySeeding = Object.keys(options).some(key => key !== 'clear' && key !== 'all' && key in DEFAULT_COUNTS);
  console.log(`🔧 Has any seeding: ${hasAnySeeding}, Options.all: ${options.all}`);

  if (!hasAnySeeding && !options.all) {
    console.log(`🔧 Applying default counts`);
    Object.assign(options, DEFAULT_COUNTS);
  }

  console.log(`🔧 Final options:`, options);
  console.log(`🔧 Will seed specific types:`, Object.keys(options).filter(key => key !== 'clear' && key !== 'all' && key in DEFAULT_COUNTS && (options as any)[key] > 0));

  try {
    console.log(`🔍 Looking up tenant: ${tenantSlug}`);
    
    // Get tenant info from owner database
    const tenant = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, tenantSlug))
      .limit(1);

    if (tenant.length === 0) {
      console.error(`❌ Tenant '${tenantSlug}' not found in owner database`);
      process.exit(1);
    }

    const tenantInfo = tenant[0];
    console.log(`✅ Found tenant: ${tenantInfo.name} (ID: ${tenantInfo.id})`);
    
    // Build database URL from tenant info
    const encodedPassword = encodeURIComponent(tenantInfo.dbPassword || '');
    const databaseUrl = `postgresql://${tenantInfo.dbUser || 'postgres'}:${encodedPassword}@${tenantInfo.dbHost}:${tenantInfo.dbPort}/${tenantInfo.dbName}?sslmode=require`;
    console.log(`📊 Database: ${tenantInfo.dbName} on ${tenantInfo.dbHost}:${tenantInfo.dbPort}`);

    if (!tenantInfo.dbName) {
      console.error('❌ No database name found for this tenant');
      process.exit(1);
    }

    // Connect to tenant database
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    const tenantDb = drizzle(pool, { schema });

    console.log(`🔗 Connected to tenant database: ${tenantInfo.dbName}`);

    // Clear data if requested
    if (options.clear) {
      console.log(`🗑️  CLEARING existing data (this is dangerous!)...`);
      await clearTenantData(tenantDb);
    }

    // Start seeding
    console.log(`🌱 Starting data seeding with options:`, options);

  // Get existing basic data (practices, users, pets) that we need for relationships
  const existingPractices = await tenantDb.query.practices.findMany();
  const existingUsers = await tenantDb.query.users.findMany();
  const existingPets = await tenantDb.query.pets.findMany({
    with: { owner: true }
  });

  console.log(`📊 Existing data: ${existingPractices.length} practices, ${existingUsers.length} users, ${existingPets.length} pets`);

  if (existingPractices.length === 0) {
    console.error(`❌ No practices found in tenant database. Please create at least one practice first.`);
    process.exit(1);
  }

  // Create accessible practice records for ALL existing users to the first practice
  if (existingUsers.length > 0) {
    console.log(`🏥 Setting up accessible practice records for all existing users...`);
    const firstPractice = existingPractices[0];

    // Check existing accessible practice records to avoid duplicates
    const existingAccessibleRecords = await tenantDb.query.administratorAccessiblePractices.findMany({
      where: (accessiblePractices, { eq }) => eq(accessiblePractices.practiceId, firstPractice.id)
    });

    const existingUserIds = new Set(existingAccessibleRecords.map(record => record.administratorId));

    // Create records for users who don't already have access
    const newAccessibleRecords = existingUsers
      .filter(user => !existingUserIds.has(user.id))
      .map(user => ({
        administratorId: user.id,
        practiceId: firstPractice.id,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    if (newAccessibleRecords.length > 0) {
      await tenantDb.insert(administratorAccessiblePractices).values(newAccessibleRecords);
      console.log(`✅ Created ${newAccessibleRecords.length} accessible practice records for existing users`);
    } else {
      console.log(`ℹ️  All existing users already have access to the first practice`);
    }
  }

  if (existingUsers.length === 0 || existingPets.length === 0) {
    console.log(`⚠️  No users or pets found. Creating basic data using existing practice...`);
    await seedBasicData(tenantDb, existingPractices[0]);

    // Refetch the data
    const practices = await tenantDb.query.practices.findMany();
    const users = await tenantDb.query.users.findMany();
    const pets = await tenantDb.query.pets.findMany({ with: { owner: true } });

    await seedAllDataTypes(tenantDb, options, practices, users, pets);
  } else {
    await seedAllDataTypes(tenantDb, options, existingPractices, existingUsers, existingPets);
  }

    await pool.end();
    console.log(`✅ Seeding completed successfully for tenant: ${tenantInfo.name}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function clearTenantData(db: any) {
  console.log(`🧹 Clearing existing seeded data...`);
  
  // Clear in reverse dependency order
  await db.delete(healthPlanNotes);
  await db.delete(healthPlanMilestones);
  await db.delete(healthPlans);
  await db.delete(appointments);
  await db.delete(soapNotes);
  await db.delete(prescriptions);
  await db.delete(vaccinations);
  await db.delete(vaccineTypes);
  await db.delete(referrals);
  await db.delete(notifications);
  await db.delete(inventory);
  
  console.log(`✅ Data cleared`);
}

async function seedBasicData(db: any, existingPractice: any) {
  console.log(`📋 Creating basic data (users, pets) using existing practice: ${existingPractice.name}...`);
  
  const password = await bcrypt.hash("password", 10);
  
  // Use the existing practice
  const practice = existingPractice;

  // Insert users
  const usersData = [
    {
      email: 'admin@seeded.com',
      username: 'admin-seeded',
      name: 'Admin User',
      password: password,
      role: 'ADMINISTRATOR' as const,
      practiceId: practice.id,
    },
    {
      email: 'vet@seeded.com',
      username: 'vet-seeded',
      name: 'Dr. Jane Smith',
      password: password,
      role: 'VETERINARIAN' as const,
      practiceId: practice.id,
    },
    {
      email: 'client1@seeded.com',
      username: 'client1-seeded',
      name: 'John Doe',
      password: password,
      role: 'CLIENT' as const,
      practiceId: practice.id,
    },
    {
      email: 'client2@seeded.com',
      username: 'client2-seeded',
      name: 'Jane Wilson',
      password: password,
      role: 'CLIENT' as const,
      practiceId: practice.id,
    }
  ];

  const insertedUsers = await db.insert(usersSchema).values(usersData).returning();

  // Create accessible practice records for all users (administrators can access practices)
  const accessiblePracticesData = [];
  const adminUsers = insertedUsers.filter((u: any) => u.role === 'ADMINISTRATOR' || u.role === 'SUPER_ADMIN');

  for (const adminUser of adminUsers) {
    accessiblePracticesData.push({
      administratorId: adminUser.id,
      practiceId: practice.id,
      assignedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  if (accessiblePracticesData.length > 0) {
    await db.insert(administratorAccessiblePractices).values(accessiblePracticesData);
    console.log(`✅ Created ${accessiblePracticesData.length} accessible practice records for administrators`);
  }

  // Insert pets
  const petOwners = insertedUsers.filter((u: any) => u.role === 'CLIENT');
  const petsData = [
    {
      name: 'Buddy',
      species: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      practiceId: practice.id,
      ownerId: petOwners[0].id,
      gender: 'male' as const,
      weight: 65.5,
      color: 'Golden',
      microchipId: 'MC001',
      isActive: true
    },
    {
      name: 'Whiskers',
      species: 'cat',
      breed: 'Persian',
      age: 2,
      practiceId: practice.id,
      ownerId: petOwners[0].id,
      gender: 'female' as const,
      weight: 8.2,
      color: 'Gray',
      microchipId: 'MC002',
      isActive: true
    },
    {
      name: 'Charlie',
      species: 'dog',
      breed: 'Beagle',
      age: 5,
      practiceId: practice.id,
      ownerId: petOwners[1].id,
      gender: 'male' as const,
      weight: 25.0,
      color: 'Tricolor',
      microchipId: 'MC003',
      isActive: true
    }
  ];

  await db.insert(pets).values(petsData);
  
  console.log(`✅ Basic data created using existing practice: ${usersData.length} users, ${petsData.length} pets`);
}

async function seedAllDataTypes(db: any, options: SeedOptions, practices: any[], users: any[], pets: any[]) {
  let vets = users.filter(u => u.role === 'VETERINARIAN' || u.role === 'ADMINISTRATOR');
  const petOwners = users.filter(u => u.role === 'CLIENT');
  const practice = practices[0];

  console.log(`👥 User roles: ${users.map(u => u.role).join(', ')}`);
  console.log(`🩺 Found ${vets.length} vets/admins, ${petOwners.length} clients`);

  // If no vets found, create one
  if (vets.length === 0) {
    console.log(`⚠️  No veterinarians found. Creating a veterinarian...`);
    const password = await bcrypt.hash("password", 10);
    
    const [newVet] = await db.insert(usersSchema).values({
      email: 'vet-seeded@seeded.com',
      username: 'vet-seeded',
      name: 'Dr. Seeded Veterinarian',
      password: password,
      role: 'VETERINARIAN' as const,
      practiceId: practice.id,
    }).returning();
    
    // Create accessible practice record for the new veterinarian if they're an admin-type role
    if (newVet.role === 'ADMINISTRATOR' || newVet.role === 'SUPER_ADMIN') {
      await db.insert(administratorAccessiblePractices).values({
        administratorId: newVet.id,
        practiceId: practice.id,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Created accessible practice record for new veterinarian`);
    }
    
    vets = [newVet];
    console.log(`✅ Created veterinarian: ${newVet.name}`);
  }

  // Seed Health Plans
  if (options.all || (options.healthPlans !== undefined && options.healthPlans > 0)) {
    await seedHealthPlans(db, options.healthPlans!, practice, pets, vets);
  }

  // Seed Appointments
  if (options.all || (options.appointments !== undefined && options.appointments > 0)) {
    await seedAppointments(db, options.appointments!, practice, pets, vets, petOwners);
  }

  // Seed SOAP Notes
  if (options.all || (options.soapNotes !== undefined && options.soapNotes > 0)) {
    await seedSoapNotes(db, options.soapNotes!, practice, pets, vets);
  }

  // Seed Prescriptions
  if (options.all || (options.prescriptions !== undefined && options.prescriptions > 0)) {
    await seedPrescriptions(db, options.prescriptions!, practice, pets, vets);
  }

  // Seed Vaccinations
  if (options.all || (options.vaccinations !== undefined && options.vaccinations > 0)) {
    await seedVaccinations(db, options.vaccinations!, practice, pets, vets);
  }

  // Seed Referrals
  if (options.all || (options.referrals !== undefined && options.referrals > 0)) {
    await seedReferrals(db, options.referrals!, practice, pets, vets, petOwners);
  }

  // Seed Notifications
  if (options.all || (options.notifications !== undefined && options.notifications > 0)) {
    await seedNotifications(db, options.notifications!, users);
  }

  // Seed Inventory Items
  if (options.all || (options.inventoryItems !== undefined && options.inventoryItems > 0)) {
    await seedInventoryItems(db, options.inventoryItems!, practice);
  }

  // Seed Health Resources
  if (options.all || (options.healthResources !== undefined && options.healthResources > 0)) {
    await seedHealthResources(db, options.healthResources!, practice);
  }

  // Seed Contacts
  if (options.all || (options.contacts !== undefined && options.contacts > 0)) {
    await seedContacts(db, options.contacts!, practice, users, pets);
  }
}

async function seedHealthPlans(db: any, count: number, practice: any, pets: any[], vets: any[]) {
  console.log(`🩺 Seeding ${count} health plans...`);
  
  // Check if we have pets
  if (pets.length === 0) {
    console.log('⚠️  No pets found, skipping health plans seeding');
    return;
  }
  
  const healthPlansData = [];
  for (let i = 0; i < count; i++) {
    const pet = pets[i % pets.length];
    const vet = vets[i % vets.length];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6 + Math.floor(Math.random() * 6));
    
    healthPlansData.push({
      name: `${pet.name}'s Health Plan ${i + 1}`,
      description: `Comprehensive health plan for ${pet.name} including regular checkups and preventive care.`,
      petId: pet.id,
      practiceId: practice.id,
      createdById: vet.id,
      startDate,
      endDate,
      status: 'active' as const
    });
  }
  
  const insertedPlans = await db.insert(healthPlans).values(healthPlansData).returning();
  
  // Add milestones for each health plan
  const milestonesData = [];
  for (const plan of insertedPlans) {
    const milestoneCount = 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < milestoneCount; j++) {
      const dueDate = new Date(plan.startDate);
      dueDate.setDate(dueDate.getDate() + (j + 1) * 30);
      
      milestonesData.push({
        healthPlanId: plan.id,
        title: `Milestone ${j + 1}: ${['Initial Checkup', 'Follow-up Visit', 'Vaccination Update', 'Dental Care', 'Blood Work', 'Final Assessment'][j]}`,
        description: `${['Complete physical examination', 'Review progress and adjust plan', 'Update vaccination schedule', 'Dental cleaning and assessment', 'Complete blood panel', 'Final health assessment'][j]}`,
        dueDate,
        completed: Math.random() > 0.5,
        completedOn: Math.random() > 0.5 ? new Date() : null
      });
    }
  }
  
  await db.insert(healthPlanMilestones).values(milestonesData);
  
  // Add notes for some health plans
  const notesData = [];
  for (let i = 0; i < Math.floor(insertedPlans.length / 2); i++) {
    const plan = insertedPlans[i];
    const vet = vets[i % vets.length];
    
    notesData.push({
      healthPlanId: plan.id,
      note: `Health plan progressing well. ${plan.name} is showing good response to the treatment protocol. Continue with scheduled milestones.`,
      createdById: vet.id,
      createdAt: new Date()
    });
  }
  
  if (notesData.length > 0) {
    await db.insert(healthPlanNotes).values(notesData);
  }
  
  console.log(`✅ Seeded ${count} health plans with ${milestonesData.length} milestones and ${notesData.length} notes`);
}

async function seedAppointments(db: any, count: number, practice: any, pets: any[], vets: any[], petOwners: any[]) {
  console.log(`📅 Seeding ${count} appointments...`);
  
  const appointmentsData = [];
  const appointmentTypes = ['checkup', 'vaccination', 'surgery', 'emergency', 'consultation', 'follow-up'];
  const statuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
  
  for (let i = 0; i < count; i++) {
    const pet = pets[i % pets.length];
    const vet = vets[i % vets.length];
    const owner = petOwners.find(o => o.id === pet.ownerId) || petOwners[0];
    
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 60) - 30);
    appointmentDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0);
    
    const appointmentType = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];
    
    appointmentsData.push({
      title: `${appointmentType} for ${pet.name}`,
      description: `Routine ${appointmentType} appointment for ${pet.name}`,
      date: appointmentDate,
      durationMinutes: String(30 + Math.floor(Math.random() * 60)),
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      petId: pet.id,
      clientId: owner.id,
      practitionerId: vet.id,
      practiceId: practice.id,
      type: appointmentType,
      source: 'internal' as const,
      notes: Math.random() > 0.5 ? `Additional notes for ${pet.name}'s appointment. Regular checkup scheduled.` : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  await db.insert(appointments).values(appointmentsData);
  console.log(`✅ Seeded ${count} appointments`);
}

async function seedSoapNotes(db: any, count: number, practice: any, pets: any[], vets: any[]) {
  console.log(`📝 Seeding ${count} SOAP notes...`);
  
  const soapNotesData = [];
  const subjectiveNotes = [
    'Pet is eating well and showing normal activity levels',
    'Owner reports decreased appetite over the past few days',
    'Pet has been more lethargic than usual',
    'Normal behavior reported by owner, good appetite',
    'Some minor digestive issues reported'
  ];
  
  const objectiveNotes = [
    'Temperature: 101.5°F, Heart Rate: 120 bpm, Respiratory Rate: 24 breaths/min',
    'Physical examination reveals normal findings',
    'Slight dehydration noted, otherwise normal',
    'Weight: stable, body condition score: 5/9',
    'All vital signs within normal limits'
  ];
  
  const assessmentNotes = [
    'Overall healthy pet with no significant concerns',
    'Mild gastric upset, likely dietary indiscretion',
    'Routine wellness examination - all normal',
    'Minor dehydration, recommend increased fluid intake',
    'Preventive care visit, vaccinations due'
  ];
  
  const planNotes = [
    'Continue current diet and exercise routine',
    'Prescribe probiotics, recheck in 1 week',
    'Update vaccinations, schedule next checkup in 6 months',
    'Increase water intake, monitor for improvement',
    'Administer vaccines, schedule follow-up as needed'
  ];
  
  for (let i = 0; i < count; i++) {
    const pet = pets[i % pets.length];
    const vet = vets[i % vets.length];
    
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 90));
    
    soapNotesData.push({
      petId: pet.id,
      practitionerId: vet.id,
      subjective: subjectiveNotes[Math.floor(Math.random() * subjectiveNotes.length)],
      objective: objectiveNotes[Math.floor(Math.random() * objectiveNotes.length)],
      assessment: assessmentNotes[Math.floor(Math.random() * assessmentNotes.length)],
      plan: planNotes[Math.floor(Math.random() * planNotes.length)],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  await db.insert(soapNotes).values(soapNotesData);
  console.log(`✅ Seeded ${count} SOAP notes`);
}

async function seedPrescriptions(db: any, count: number, practice: any, pets: any[], vets: any[]) {
  console.log(`💊 Seeding ${count} prescriptions...`);
  
  const medications = [
    { name: 'Amoxicillin', dosage: '250mg', route: 'oral', frequency: 'BID', duration: '7 days' },
    { name: 'Metacam', dosage: '5mg', route: 'oral', frequency: 'once', duration: '5 days' },
    { name: 'Prednisone', dosage: '10mg', route: 'oral', frequency: 'once', duration: '10 days' },
    { name: 'Heartgard', dosage: '25mg', route: 'oral', frequency: 'monthly', duration: 'Ongoing' },
    { name: 'Frontline', dosage: '1 application', route: 'topical', frequency: 'monthly', duration: 'Ongoing' }
  ];

  const prescriptionsData = [];

  for (let i = 0; i < count; i++) {
    const pet = pets[i % pets.length];
    const vet = vets[i % vets.length];
    const med = medications[Math.floor(Math.random() * medications.length)];

    const prescribedDate = new Date();
    prescribedDate.setDate(prescribedDate.getDate() - Math.floor(Math.random() * 30));

    prescriptionsData.push({
      petId: pet.id,
      prescribedBy: vet.id,
      practiceId: practice.id,
      medicationName: med.name,
      dosage: med.dosage,
      route: med.route,
      frequency: med.frequency,
      duration: med.duration,
      instructions: `Administer ${med.dosage} ${med.frequency} for ${med.duration}. Give with food if stomach upset occurs.`,
      quantityPrescribed: "30",
      quantityDispensed: "0",
      refillsAllowed: Math.floor(Math.random() * 3),
      refillsRemaining: Math.floor(Math.random() * 3),
      isActive: Math.random() > 0.3,
      status: 'active',
      prescribedDate,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  await db.insert(prescriptions).values(prescriptionsData);
  console.log(`✅ Seeded ${count} prescriptions`);
}

async function seedVaccinations(db: any, count: number, practice: any, pets: any[], vets: any[]) {
  console.log(`💉 Seeding ${count} vaccinations...`);
  
  // First create vaccine types
  const vaccineTypesData = [
    {
      practiceId: practice.id,
      name: 'DHPP (Canine)',
      type: 'core' as const,
      species: 'dog',
      manufacturer: 'Zoetis',
      diseasesProtected: JSON.stringify(['Distemper', 'Hepatitis', 'Parvovirus', 'Parainfluenza']),
      recommendedSchedule: JSON.stringify({ puppy: '6-8 weeks, 10-12 weeks, 14-16 weeks', adult: 'Annual' }),
      durationOfImmunity: '1 year'
    },
    {
      practiceId: practice.id,
      name: 'Rabies',
      type: 'core' as const,
      species: 'both',
      manufacturer: 'Merial',
      diseasesProtected: JSON.stringify(['Rabies']),
      recommendedSchedule: JSON.stringify({ initial: '12-16 weeks', booster: '1 year later, then every 3 years' }),
      durationOfImmunity: '3 years'
    },
    {
      practiceId: practice.id,
      name: 'FVRCP (Feline)',
      type: 'core' as const,
      species: 'cat',
      manufacturer: 'Zoetis',
      diseasesProtected: JSON.stringify(['Rhinotracheitis', 'Calicivirus', 'Panleukopenia']),
      recommendedSchedule: JSON.stringify({ kitten: '6-8 weeks, 10-12 weeks, 14-16 weeks', adult: 'Annual' }),
      durationOfImmunity: '1 year'
    }
  ];
  
  const insertedVaccineTypes = await db.insert(vaccineTypes).values(vaccineTypesData).returning();
  
  // Now create vaccinations
  const vaccinationsData = [];
  
  for (let i = 0; i < count; i++) {
    const pet = pets[i % pets.length];
    const vet = vets[i % vets.length];
    const vaccineType = insertedVaccineTypes.find((vt: any) =>
      vt.species === pet.species || vt.species === 'both'
    ) || insertedVaccineTypes[0];
    
    const administeredDate = new Date();
    administeredDate.setDate(administeredDate.getDate() - Math.floor(Math.random() * 365));
    
    const nextDueDate = new Date(administeredDate);
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    
    vaccinationsData.push({
      petId: pet.id,
      vaccineTypeId: vaccineType.id,
      administeringVetId: vet.id,
      practiceId: practice.id,
      vaccineName: vaccineType.name,
      manufacturer: vaccineType.manufacturer,
      administrationDate: administeredDate,
      nextDueDate,
      lotNumber: `LOT${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      notes: `Routine ${vaccineType.name} vaccination administered. No adverse reactions observed.`,
      status: 'completed' as const
    });
  }
  
  await db.insert(vaccinations).values(vaccinationsData);
  console.log(`✅ Seeded ${vaccineTypesData.length} vaccine types and ${count} vaccinations`);
}

async function seedReferrals(db: any, count: number, practice: any, pets: any[], vets: any[], petOwners: any[]) {
  console.log(`🏥 Seeding ${count} referrals...`);
  
  const specialties = ['Cardiology', 'Oncology', 'Dermatology', 'Orthopedics', 'Ophthalmology', 'Internal Medicine'];
  const statuses = ['pending', 'scheduled', 'completed', 'cancelled'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  
  const referralsData = [];
  
  for (let i = 0; i < count; i++) {
    const pet = pets[i % pets.length];
    const vet = vets[i % vets.length];
    const owner = petOwners.find(o => o.id === pet.ownerId) || petOwners[0];
    
    const referralDate = new Date();
    referralDate.setDate(referralDate.getDate() - Math.floor(Math.random() * 30));
    
    referralsData.push({
      petId: pet.id,
      referringPracticeId: practice.id,
      referringVetId: vet.id,
      specialistName: `Dr. ${['Johnson', 'Brown', 'Davis', 'Wilson', 'Moore'][Math.floor(Math.random() * 5)]}`,
      specialistPractice: `${specialties[Math.floor(Math.random() * specialties.length)]} Specialists`,
      referralReason: `${pet.name} requires specialized ${specialties[i % specialties.length].toLowerCase()} consultation for advanced treatment.`,
      specialty: specialties[Math.floor(Math.random() * specialties.length)] as any,
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      priority: priorities[Math.floor(Math.random() * priorities.length)] as any,
      referralNotes: `Referral for specialized care. Please contact specialist directly for scheduling.`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  await db.insert(referrals).values(referralsData);
  console.log(`✅ Seeded ${count} referrals`);
}

async function seedNotifications(db: any, count: number, users: any[]) {
  console.log(`🔔 Seeding ${count} notifications...`);
  
  const types = ['appointment_reminder', 'vaccination_due', 'payment_overdue', 'system_update', 'health_plan_milestone'];
  const priorities = ['low', 'medium', 'high'];
  
  const notificationMessages = {
    appointment_reminder: 'You have an upcoming appointment',
    vaccination_due: 'Vaccination is due for your pet',
    payment_overdue: 'Payment is overdue for recent services',
    system_update: 'System maintenance scheduled',
    health_plan_milestone: 'Health plan milestone is due'
  };
  
  const notificationsData = [];
  
  for (let i = 0; i < count; i++) {
    const user = users[i % users.length];
    const type = types[Math.floor(Math.random() * types.length)] as keyof typeof notificationMessages;
    
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 7));
    
    notificationsData.push({
      userId: user.id,
      type,
      title: notificationMessages[type],
      message: `${notificationMessages[type]} - ${user.firstName}, please check your account for more details.`,
      priority: priorities[Math.floor(Math.random() * priorities.length)] as any,
      isRead: Math.random() > 0.4,
      createdAt: createdDate,
      updatedAt: createdDate
    });
  }
  
  await db.insert(notifications).values(notificationsData);
  console.log(`✅ Seeded ${count} notifications`);
}

async function seedInventoryItems(db: any, count: number, practice: any) {
  console.log(`📦 Seeding ${count} inventory items...`);
  
  const categories = ['Medication', 'Supplies', 'Equipment', 'Food', 'Toys', 'Cleaning'];
  const units = ['pieces', 'bottles', 'boxes', 'bags', 'tubes', 'vials'];
  
  const inventoryData = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const itemNames = {
      Medication: ['Antibiotics', 'Pain Relief', 'Anti-inflammatory', 'Heartworm Prevention'],
      Supplies: ['Syringes', 'Bandages', 'Gloves', 'Thermometers'],
      Equipment: ['Stethoscope', 'X-ray Film', 'Ultrasound Gel', 'Surgical Tools'],
      Food: ['Premium Dog Food', 'Cat Food', 'Special Diet Food', 'Treats'],
      Toys: ['Chew Toys', 'Interactive Toys', 'Balls', 'Rope Toys'],
      Cleaning: ['Disinfectant', 'Paper Towels', 'Soap', 'Surface Cleaner']
    };
    
    const itemName = itemNames[category as keyof typeof itemNames][Math.floor(Math.random() * itemNames[category as keyof typeof itemNames].length)];
    
    inventoryData.push({
      practiceId: practice.id,
      name: `${itemName} ${i + 1}`,
      type: category.toLowerCase(),
      description: `High-quality ${itemName.toLowerCase()} for veterinary use`,
      sku: `SKU${(i + 1000).toString().padStart(6, '0')}`,
      quantity: Math.floor(Math.random() * 100) + 10,
      minQuantity: Math.floor(Math.random() * 20) + 5,
      price: (Math.random() * 100 + 10).toFixed(2),
      unit: units[Math.floor(Math.random() * units.length)],
      supplier: ['VetSupply Co', 'MedVet Products', 'Animal Care Inc', 'Pet Health Supply'][Math.floor(Math.random() * 4)],
    });
  }
  
  await db.insert(inventory).values(inventoryData);
  console.log(`✅ Seeded ${count} inventory items`);
}

async function seedHealthResources(db: any, count: number, practice: any) {
  console.log(`📚 Seeding ${count} health resources...`);
  
  const categories = ['wellness', 'nutrition', 'emergency', 'behavior', 'grooming', 'exercise', 'vaccination', 'preventive-care', 'dental-care', 'senior-care'];
  const types = ['article', 'video', 'infographic', 'checklist', 'guide', 'emergency-contact'];
  const species = ['dog', 'cat', 'bird', 'reptile', 'rabbit', 'ferret', 'all'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];
  
  const healthResourcesData = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const selectedSpecies = species[Math.floor(Math.random() * species.length)];
    
    const titles = {
      'wellness': ['Daily Health Check for Pets', 'Signs of a Healthy Pet', 'Wellness Routine Guidelines'],
      'nutrition': ['Proper Pet Nutrition Guide', 'Feeding Schedule Tips', 'Healthy Treat Options'],
      'emergency': ['Emergency First Aid', 'When to Call Emergency Vet', 'Emergency Contact List'],
      'behavior': ['Training Your Pet', 'Understanding Pet Behavior', 'Socialization Tips'],
      'grooming': ['Basic Grooming Guide', 'Nail Trimming Tips', 'Coat Care Essentials'],
      'exercise': ['Exercise Requirements', 'Fun Activities for Pets', 'Indoor Exercise Ideas'],
      'vaccination': ['Vaccination Schedule', 'Vaccine Information', 'Post-Vaccination Care'],
      'preventive-care': ['Preventive Care Checklist', 'Regular Health Screenings', 'Parasite Prevention'],
      'dental-care': ['Dental Health Guide', 'Brushing Your Pet\'s Teeth', 'Signs of Dental Problems'],
      'senior-care': ['Caring for Senior Pets', 'Age-Related Health Changes', 'Senior Pet Comfort']
    };
    
    const categoryTitles = titles[category as keyof typeof titles] || ['General Pet Care'];
    const title = categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
    
    healthResourcesData.push({
      practiceId: practice.id,
      title: `${title} ${i + 1}`,
      description: `Comprehensive guide about ${title.toLowerCase()} for ${selectedSpecies === 'all' ? 'all pets' : selectedSpecies}`,
      content: `This is detailed content about ${title.toLowerCase()}. It covers important aspects of pet care and provides valuable insights for pet owners.`,
      category,
      type,
      species: selectedSpecies,
      thumbnailUrl: type === 'video' ? '/assets/video-thumb.jpg' : '/assets/article-thumb.jpg',
      author: ['Dr. Sarah Johnson', 'Dr. Mike Peterson', 'Dr. Lisa Chen', 'Dr. Robert Williams'][Math.floor(Math.random() * 4)],
      tags: JSON.stringify([category, selectedSpecies, type]),
      estimatedReadTime: type === 'video' ? '10 minutes' : '5 minutes',
      difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
      featured: Math.random() > 0.7,
      isPublic: true,
      isActive: true,
      viewCount: Math.floor(Math.random() * 100).toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  await db.insert(healthResources).values(healthResourcesData);
  console.log(`✅ Seeded ${count} health resources`);
}

async function seedContacts(db: any, count: number, practice: any, users: any[], pets: any[]) {
  console.log(`📞 Seeding ${count} contacts...`);
  
  // Check if we have users
  if (users.length === 0) {
    console.log('⚠️  No users found, skipping contacts seeding');
    return;
  }
  
  const petOwners = users.filter((u: any) => u.role === 'CLIENT');
  const vets = users.filter((u: any) => u.role === 'VETERINARIAN' || u.role === 'ADMINISTRATOR');
  
  if (petOwners.length === 0) {
    console.log('⚠️  No clients found, skipping contacts seeding');
    return;
  }
  
  const contactMethods = ['phone_call', 'video_call', 'message'];
  const urgencyLevels = ['low', 'medium', 'high', 'emergency'];
  const statuses = ['pending', 'in_progress', 'responded', 'closed'];
  
  const subjects = [
    'Question about medication',
    'Scheduling appointment',
    'Pet behavior concerns',
    'Emergency consultation needed',
    'Follow-up on treatment',
    'Prescription refill request',
    'General health inquiry',
    'Vaccination schedule question',
    'Diet and nutrition advice',
    'Post-surgery care questions'
  ];
  
  const contactsData = [];
  
  for (let i = 0; i < count; i++) {
    const sender = petOwners[i % petOwners.length];
    const vet = vets.length > 0 ? vets[Math.floor(Math.random() * vets.length)] : null;
    const pet = pets.length > 0 ? pets[Math.floor(Math.random() * pets.length)] : null;
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isResponded = status === 'responded' || status === 'closed';
    
    contactsData.push({
      senderId: sender.id,
      veterinarianId: vet?.id || null,
      practiceId: practice.id,
      petId: pet?.id || null,
      contactMethod: contactMethods[Math.floor(Math.random() * contactMethods.length)],
      urgency: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
      status,
      subject,
      message: `Hello, I have a question regarding ${subject.toLowerCase()}. Could you please help me understand what I should do?`,
      phoneNumber: Math.random() > 0.5 ? `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` : null,
      preferredTime: Math.random() > 0.6 ? ['Morning', 'Afternoon', 'Evening'][Math.floor(Math.random() * 3)] : null,
      isRead: Math.random() > 0.3,
      respondedAt: isResponded ? new Date(createdDate.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null,
      respondedBy: isResponded && vet ? vet.id : null,
      createdAt: createdDate,
      updatedAt: createdDate
    });
  }
  
  await db.insert(contacts).values(contactsData);
  console.log(`✅ Seeded ${count} contacts`);
}

// Run the script
seedTenantData().catch(console.error);
