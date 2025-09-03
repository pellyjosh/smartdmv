import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users as usersTable, sessions as sessionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

const HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME = 'session-token';

async function debugAuthentication() {
  try {
    console.log('🔍 Debugging authentication system...');

    // Check if we can access cookies (this simulates server-side request)
    console.log('\n1. Checking cookie access...');
    // Note: This won't work in this script context, but shows the process

    // Check sessions in database
    console.log('\n2. Checking active sessions in database...');
    const sessions = await db.select().from(sessionsTable).limit(10);
    console.log(`Found ${sessions.length} sessions in database:`);
    
    for (const session of sessions) {
      const isExpired = new Date(session.expiresAt) < new Date();
      console.log(`  Session ID: ${session.id}, User ID: ${session.userId}, Expired: ${isExpired}`);
    }

    // Check users in database
    console.log('\n3. Checking users in database...');
    const users = await db.select().from(usersTable).limit(5);
    console.log(`Found ${users.length} users in database:`);
    
    for (const user of users) {
      console.log(`  User ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    }

    // Check for any SUPER_ADMIN users
    console.log('\n4. Checking for SUPER_ADMIN users...');
    const superAdmins = await db.select().from(usersTable).where(eq(usersTable.role, 'SUPER_ADMIN'));
    console.log(`Found ${superAdmins.length} SUPER_ADMIN users:`);
    
    for (const admin of superAdmins) {
      console.log(`  SUPER_ADMIN: ${admin.email} (ID: ${admin.id})`);
    }

    // Provide troubleshooting recommendations
    console.log('\n🔧 Troubleshooting Recommendations:');
    console.log('1. Ensure you are logged in to the application');
    console.log('2. Check browser cookies for "session-token"');
    console.log('3. Verify session has not expired');
    console.log('4. Check if user exists and has proper role');
    
    if (sessions.length === 0) {
      console.log('⚠️  No sessions found - users may need to log in');
    }
    
    if (users.length === 0) {
      console.log('⚠️  No users found - database may need seeding');
    }

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugAuthentication()
  .then(() => {
    console.log('🎉 Authentication debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Authentication debug failed:', error);
    process.exit(1);
  });
