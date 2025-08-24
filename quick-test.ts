#!/usr/bin/env ts-node
// Quick test to verify appointment types are working

import { config } from 'dotenv';
config();

import { Pool } from 'pg';

async function quickTest() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Database URL not found. Set DATABASE_URL in your environment');
  }

  // Normalize connection string: percent-encode password portion if it contains
  // characters that break URL parsing (for example '#'). This avoids ERR_INVALID_URL
  const normalizeConnectionString = (conn: string) => {
    try { new URL(conn); return conn; } catch (e) {}
    const m = conn.match(/^([^:]+:\/\/)([^@]+)@(.*)$/);
    if (m) {
      const scheme = m[1];
      const userinfo = m[2];
      const rest = m[3];
      const parts = userinfo.split(':');
      if (parts.length >= 2) {
        const user = parts.shift();
        const pass = parts.join(':');
        const encPass = encodeURIComponent(pass);
        const newUserinfo = `${user}:${encPass}`;
        return `${scheme}${newUserinfo}@${rest}`;
      }
    }
    return conn;
  };

  const connectionString = normalizeConnectionString(databaseUrl);
  const pool = new Pool({ connectionString });

  try {
    console.log('🔍 Quick appointment types check...');

    // Check appointments with types
    const { rows: appointments } = await pool.query(`
      SELECT id, title, type, status
      FROM appointments
      WHERE type IS NOT NULL
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('\n📋 Recent appointments:');
    appointments.forEach((apt: any) => {
      console.log(`  ID: ${apt.id} | Type: "${apt.type}" | Title: "${apt.title}"`);
    });

    // Count virtual appointments
    const { rows: virtualRows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE type IN ('telemedicine', 'virtual-consultation', 'virtual')
    `);

    console.log(`\n🎯 Virtual appointments available: ${virtualRows[0]?.count ?? 0}`);

    console.log('\n✅ Database check complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

quickTest().then(() => {
  console.log('Ready to test telemedicine UI!');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
