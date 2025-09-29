#!/usr/bin/env tsx
/**
 * List Tenant Databases Script
 * Lists all tenants and their database information from the owner database
 */
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/db/owner-schema';
import { asc, eq } from 'drizzle-orm';

async function listTenantDbs() {
  const statusFilter = process.argv[2];
  
  try {
    console.log('🏢 SmartDMV Tenant Databases\n');
    
    // Get all tenants from owner database
    let allTenants;
    
    if (statusFilter) {
      console.log(`📋 Filtering by status: ${statusFilter.toUpperCase()}`);
      allTenants = await ownerDb
        .select()
        .from(tenants)
        .where(eq(tenants.status, statusFilter.toUpperCase() as any))
        .orderBy(asc(tenants.name));
    } else {
      allTenants = await ownerDb
        .select()
        .from(tenants)
        .orderBy(asc(tenants.name));
    }

    if (allTenants.length === 0) {
      if (statusFilter) {
        console.log(`❌ No tenants found with status: ${statusFilter.toUpperCase()}`);
      } else {
        console.log('❌ No tenants found in owner database');
      }
      return;
    }

    console.log(`✅ Found ${allTenants.length} tenant${allTenants.length > 1 ? 's' : ''}:\n`);

    // Display tenant list in a table format
    console.log('┌─────┬──────────────────────┬───────────────────────┬─────────────────────┬──────────────┬──────────────┐');
    console.log('│ ID  │ Name                 │ Subdomain             │ Database            │ Status       │ Plan         │');
    console.log('├─────┼──────────────────────┼───────────────────────┼─────────────────────┼──────────────┼──────────────┤');

    for (const tenant of allTenants) {
      const id = tenant.id.toString().padEnd(3);
      const name = (tenant.name || 'N/A').slice(0, 19).padEnd(19);
      const subdomain = (tenant.subdomain || 'N/A').slice(0, 20).padEnd(20);
      const dbName = (tenant.dbName || 'N/A').slice(0, 18).padEnd(18);
      const status = (tenant.status || 'UNKNOWN').slice(0, 11).padEnd(11);
      const plan = (tenant.plan || 'FREE').slice(0, 11).padEnd(11);
      
      console.log(`│ ${id} │ ${name} │ ${subdomain} │ ${dbName} │ ${status} │ ${plan} │`);
    }

    console.log('└─────┴──────────────────────┴───────────────────────┴─────────────────────┴──────────────┴──────────────┘');

    console.log('\n📝 Usage examples:');
    console.log('• View a tenant database in Drizzle Studio:');
    console.log('  npm run db:tenant:view <subdomain>');
    console.log('\n• Filter by status:');
    console.log('  npm run db:tenant:list active');
    console.log('  npm run db:tenant:list inactive');
    console.log('  npm run db:tenant:list suspended');

    console.log('\n💡 Available tenant subdomains for viewing:');
    const activeSubdomains = allTenants
      .filter(t => t.status === 'ACTIVE' && t.subdomain)
      .map(t => t.subdomain)
      .sort();
    
    if (activeSubdomains.length > 0) {
      console.log(activeSubdomains.map(s => `  • ${s}`).join('\n'));
    } else {
      console.log('  No active tenants available');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listTenantDbs().catch(console.error);
