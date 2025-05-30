
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

config(); // Load environment variables from .env file

import { db } from './index';
import { practices, users, administratorAccessiblePractices, userRoleEnum } from './schema';
import { User } from '@/context/UserContext';
// import type { User } from '@/hooks/useAuth'; // For role enum consistency
// import { sql } from 'drizzle-orm'; // Not used directly in this version of seed

// For SQLite, we might want to enable foreign keys explicitly if not done by the driver by default
// Though for `better-sqlite3` driver, it's usually on.
// async function enableForeignKeysForSqlite() {
//   if (process.env.DB_TYPE === 'sqlite') {
//     await db.run(sql`PRAGMA foreign_keys = ON;`);
//     console.log('SQLite foreign_keys enabled.');
//   }
// }

async function seed() {
  console.log('🌱 Starting database seeding...');
  console.log(`Database type from env: ${process.env.DB_TYPE}`); // Log to confirm env var is read

  const password = await bcrypt.hash("password", 10);

  const practicesData = [
    { id: 'practice_MAIN_HQ', name: 'Main HQ Vet Clinic' },
    { id: 'practice_NORTH', name: 'North Paws Clinic' },
    { id: 'practice_SOUTH', name: 'South Valley Vets' },
  ];

  // Pre-generate UUIDs for users to ensure consistent linking
  const adminUserId = crypto.randomUUID();
  const practiceAdminUserId = crypto.randomUUID();
  const client1UserId = crypto.randomUUID();
  const client2UserId = crypto.randomUUID();

  const usersData = [
    {
      id: adminUserId,
      email: 'admin@vetconnect.pro',
      name: 'Admin User',
      password: password,
      role: 'ADMINISTRATOR' as User['role'],
      practiceId: null, // Global admin might not be tied to a single practice in this way
      currentPracticeId: 'practice_MAIN_HQ',
    },
    {
      id: practiceAdminUserId,
      email: 'vet@vetconnect.pro',
      name: 'Dr. Vet PracticeAdmin',
      password: password,
      role: 'PRACTICE_ADMINISTRATOR' as User['role'],
      practiceId: 'practice_NORTH', // Manages North Clinic
      currentPracticeId: 'practice_NORTH',
    },
    {
      id: client1UserId,
      email: 'client@vetconnect.pro',
      name: 'Pet Owner Client',
      password: password,
      role: 'CLIENT' as User['role'],
      practiceId: 'practice_NORTH', // Belongs to North Clinic
      currentPracticeId: null,
    },
    {
      id: client2UserId,
      email: 'testclient@example.com',
      name: 'Test Client Example',
      password: password,
      role: 'CLIENT' as User['role'],
      practiceId: 'practice_SOUTH', // Belongs to South Clinic
      currentPracticeId: null,
    },
  ];

  const adminAccessData = [
    { administratorId: adminUserId, practiceId: 'practice_MAIN_HQ' },
    { administratorId: adminUserId, practiceId: 'practice_NORTH' },
    { administratorId: adminUserId, practiceId: 'practice_SOUTH' },
  ];

  // await enableForeignKeysForSqlite(); // If needed

  // For simplicity, we'll delete existing data first to make the seeder idempotent.
  // In a production-like seeder, you might want more sophisticated checks or updates.
  console.log('🗑️ Clearing existing data...');
  try {
    // Order of deletion matters due to foreign key constraints if they are enforced
    await db.delete(administratorAccessiblePractices);
    await db.delete(users);
    await db.delete(practices);
    console.log('✅ Existing data cleared.');
  } catch (error) {
    console.error('⚠️ Error clearing data (might be okay if tables are empty):', error);
  }

  console.log('Inserting practices...');
  try {
    await db.insert(practices).values(practicesData);
    console.log(`✅ Inserted ${practicesData.length} practices.`);
  } catch (error) {
    console.error('❌ Error inserting practices:', error);
    throw error; // Stop seeding if critical data fails
  }

  console.log('Inserting users...');
  try {
    // Ensure role values are correctly typed for insertion
    const typedUsersData = usersData.map(user => ({
      ...user,
      role: user.role as typeof userRoleEnum[number], // Cast to the specific enum type Drizzle expects for the column
    }));
    await db.insert(users).values(typedUsersData);
    console.log(`✅ Inserted ${usersData.length} users.`);
  } catch (error)
 {
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

  console.log('🌳 Database seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Database seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // If your db client has a close/end method, you might call it here.
    // For `postgres` (node-postgres), it's `await sql.end()`.
    // For `better-sqlite3`, the `db` object in `src/db/index.ts` is derived from `sqliteClient.close()`.
    // Node.js will typically handle resource cleanup on script exit if not explicitly closed.
    console.log('🌱 Seeder script finished.');
  });
