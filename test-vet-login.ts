import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testUserLogin() {
  try {
    console.log('🔍 Testing user login for veterinarian...\n');
    
    // Get the veterinarian user
    const veterinarianUser = await db.query.users.findFirst({
      where: eq(users.email, 'dr.smith@vetconnect.pro'),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        practiceId: true,
        currentPracticeId: true,
        password: true,
      }
    });

    if (!veterinarianUser) {
      console.log('❌ Veterinarian user not found');
      return;
    }

    console.log('👨‍⚕️ Found veterinarian user:');
    console.log(`  Email: ${veterinarianUser.email}`);
    console.log(`  Name: ${veterinarianUser.name}`);
    console.log(`  Role: ${veterinarianUser.role}`);
    console.log(`  Practice ID: ${veterinarianUser.practiceId}`);
    console.log(`  Current Practice ID: ${veterinarianUser.currentPracticeId}`);
    console.log(`  Has password: ${veterinarianUser.password ? 'Yes' : 'No'}`);

    // Test common passwords
    const testPasswords = ['password123', 'password', 'admin123', 'vet123', 'test123'];
    
    if (veterinarianUser.password && typeof veterinarianUser.password === 'string') {
      console.log('\n🔐 Testing passwords...');
      for (const testPassword of testPasswords) {
        const isMatch = bcrypt.compareSync(testPassword, veterinarianUser.password);
        console.log(`  ${testPassword}: ${isMatch ? '✅ MATCH' : '❌ No match'}`);
        if (isMatch) {
          console.log(`\n🎉 Password found: ${testPassword}`);
          break;
        }
      }
    } else {
      console.log('\n⚠️  User has no password set or password is not a string');
    }

  } catch (error) {
    console.error('❌ Error testing user login:', error);
  }
}

// Run the function
testUserLogin();
