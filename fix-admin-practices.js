/**
 * Check user practice assignments
 * This script checks what practiceId values users have in the database
 */

require('dotenv').config();
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

async function checkUserPractices() {
  // Connect to tenant database (innova - ID 19)
  const tenantPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'smartdmv_tenant_19',
  });

  try {
    console.log('🔍 Checking users table...\n');
    
    // Query users directly with SQL
    const usersResult = await tenantPool.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        practice_id, 
        current_practice_id 
      FROM users 
      WHERE email = 'innova@gmail.com'
      ORDER BY id
    `);

    if (usersResult.rows.length === 0) {
      console.log('❌ No user found with email innova@gmail.com');
    } else {
      console.log('✅ User found:');
      usersResult.rows.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   practiceId (practice_id): ${user.practice_id}`);
        console.log(`   currentPracticeId (current_practice_id): ${user.current_practice_id}`);
        console.log('');
      });

      // Check administratorAccessiblePractices
      const adminPracticesResult = await tenantPool.query(`
        SELECT 
          aap.administrator_id,
          aap.practice_id,
          p.name as practice_name
        FROM administrator_accessible_practices aap
        LEFT JOIN practices p ON aap.practice_id = p.id
        WHERE aap.administrator_id = $1
      `, [usersResult.rows[0].id]);

      console.log('\n🔍 Administrator accessible practices:');
      if (adminPracticesResult.rows.length === 0) {
        console.log('   ❌ No entries in administrator_accessible_practices table');
      } else {
        adminPracticesResult.rows.forEach(row => {
          console.log(`   ✅ Practice ID: ${row.practice_id}, Name: ${row.practice_name}`);
        });
      }
    }

    // Also check all practices
    console.log('\n🔍 All practices in database:');
    const practicesResult = await tenantPool.query('SELECT id, name FROM practices ORDER BY id');
    if (practicesResult.rows.length === 0) {
      console.log('   ❌ No practices found');
    } else {
      practicesResult.rows.forEach(p => {
        console.log(`   - ID: ${p.id}, Name: ${p.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await tenantPool.end();
  }
}

checkUserPractices();
