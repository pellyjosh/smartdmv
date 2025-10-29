#!/usr/bin/env tsx
/**
 * View Tenant Database Script
 * Launches Drizzle Studio for a specific tenant's database
 */
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/owner/db/schemas/ownerSchema';
import { eq } from 'drizzle-orm';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function viewTenantDb() {
  const tenantSlug = process.argv[2];
  
  if (!tenantSlug) {
    console.log('Usage: npm run db:tenant:view <tenant-slug>');
    console.log('Example: npm run db:tenant:view smartvet');
    process.exit(1);
  }

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
    
    // Build database URL from tenant info - URL encode the password
    const encodedPassword = encodeURIComponent(tenantInfo.dbPassword || '');
    const databaseUrl = `postgresql://${tenantInfo.dbUser || 'postgres'}:${encodedPassword}@${tenantInfo.dbHost}:${tenantInfo.dbPort}/${tenantInfo.dbName}?sslmode=require`;
    console.log(`📊 Database: ${tenantInfo.dbName} on ${tenantInfo.dbHost}:${tenantInfo.dbPort}`);

    if (!tenantInfo.dbName) {
      console.error('❌ No database name found for this tenant');
      process.exit(1);
    }

    // Create a temporary drizzle config for this tenant
    const tempConfigContent = `
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "${databaseUrl}",
  },
} satisfies Config;
`;

    const tempConfigPath = path.join(process.cwd(), `drizzle.${tenantSlug}.config.ts`);
    fs.writeFileSync(tempConfigPath, tempConfigContent);

    console.log(`📝 Created temporary config: ${tempConfigPath}`);
    console.log(`🚀 Launching Drizzle Studio for tenant: ${tenantInfo.name}`);
    console.log('📌 Press Ctrl+C to stop Drizzle Studio and clean up the temporary config');

    // Launch Drizzle Studio with the temporary config
    const studioCommand = `npx drizzle-kit studio --config "${tempConfigPath}"`;
    console.log(`Running command: ${studioCommand}`);
    
    const studio = spawn(studioCommand, [], {
      stdio: 'inherit',
      shell: true
    });

    // Clean up on exit
    const cleanup = () => {
      console.log('\n🧹 Cleaning up temporary config file...');
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
        console.log('✅ Temporary config file removed');
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    studio.on('close', (code) => {
      console.log(`\n📊 Drizzle Studio exited with code ${code}`);
      cleanup();
    });

    studio.on('error', (error) => {
      console.error('❌ Error launching Drizzle Studio:', error);
      cleanup();
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

viewTenantDb().catch(console.error);
