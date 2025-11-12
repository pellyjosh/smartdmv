// Check tenant records in owner database
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { tenants } = require('./src/owner/db/schemas/ownerSchema');

async function checkTenants() {
  const pool = new Pool({
    connectionString: process.env.OWNER_DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('Fetching all tenant records...\n');
  const allTenants = await db.select().from(tenants);

  console.log('Found', allTenants.length, 'tenants:\n');
  allTenants.forEach(tenant => {
    console.log(`ID: ${tenant.id}`);
    console.log(`  Subdomain: ${tenant.subdomain}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  DB Name: ${tenant.dbName}`);
    console.log(`  Status: ${tenant.status}`);
    console.log('---');
  });

  await pool.end();
}

checkTenants().catch(console.error);
