#!/usr/bin/env tsx
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/db/owner-schema';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

const { currencies } = schema;

async function seedCurrenciesForTenant(tenantSlug: string) {
  if (!tenantSlug) {
    console.log('Usage: npm run db:tenant:seed-currencies -- <tenant-slug>');
    process.exit(1);
  }

  // Find tenant in owner DB
  const tenantRes = await ownerDb.select().from(tenants).where(eq(tenants.subdomain, tenantSlug)).limit(1);
  if (tenantRes.length === 0) {
    console.error(`Tenant ${tenantSlug} not found`);
    process.exit(1);
  }
  const tenant = tenantRes[0];

  const encodedPassword = encodeURIComponent(tenant.dbPassword || '');
  const databaseUrl = `postgresql://${tenant.dbUser || 'postgres'}:${encodedPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?sslmode=require`;

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  // Ensure currencies table exists (safe: will not drop/modify existing)
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS currencies (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimals TEXT DEFAULT '2',
      active TEXT NOT NULL DEFAULT 'yes',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableSQL);
  } catch (err) {
    console.error('Failed creating currencies table:', err);
    await pool.end();
    process.exit(1);
  }

  const tenantDb = drizzle(pool, { schema });

  // If currencies already present, skip
  const existing = await tenantDb.select().from(currencies).limit(1).catch(() => []);
  if (existing && existing.length > 0) {
    console.log('Currencies already seeded for tenant, skipping');
    await pool.end();
    return;
  }

  const seed = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: '2', active: 'yes', createdAt: new Date(), updatedAt: new Date() },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: '2', active: 'yes', createdAt: new Date(), updatedAt: new Date() },
  ];

  try {
    await tenantDb.insert(currencies).values(seed);
    console.log(`Seeded ${seed.length} currencies for tenant ${tenantSlug}`);
  } catch (err) {
    // If drizzle insert fails for any reason, fallback to raw SQL insert
    console.warn('Drizzle insert failed, attempting raw SQL insert:', err);
    const sql = `INSERT INTO currencies (code, name, symbol, decimals, active, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7),($8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (code) DO NOTHING;`;
    const now = new Date().toISOString();
    await pool.query(sql, [
      'USD','US Dollar','$','2','yes', now, now,
      'NGN','Nigerian Naira','₦','2','yes', now, now
    ]).catch(e => console.error('Raw SQL insert failed:', e));
    console.log('Seed attempt complete (raw SQL fallback used)');
  }

  await pool.end();
}

const args = process.argv.slice(2);
seedCurrenciesForTenant(args[0]).catch(err => { console.error(err); process.exit(1); });
