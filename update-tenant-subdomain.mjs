import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { tenants } from './src/owner/db/schemas/ownerSchema.ts';
import { eq } from 'drizzle-orm';

async function updateTenantSubdomain() {
  const pool = new Pool({
    connectionString: process.env.OWNER_DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('Updating tenant record with ID 20...\n');
  
  // Update the tenant record
  const updated = await db
    .update(tenants)
    .set({ subdomain: 'innova' })
    .where(eq(tenants.id, 20))
    .returning();

  console.log('Updated tenant:', updated[0]);
  console.log('\nTenant subdomain updated successfully!');

  await pool.end();
}

updateTenantSubdomain().catch(console.error);
