#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function quickTest() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Database URL not found. Set DATABASE_URL in your environment');
    process.exit(1);
  }

  // Normalize connection string: percent-encode password if it contains illegal URL chars
  function normalizeConnectionString(conn) {
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
  }

  const connectionString = normalizeConnectionString(databaseUrl);
  const pool = new Pool({ connectionString });

  try {
    console.log('🔍 Quick appointment types check...');

    const { rows: appointments } = await pool.query(`
      SELECT id, title, type, status
      FROM appointments
      WHERE type IS NOT NULL
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('\n📋 Recent appointments:');
    appointments.forEach((apt) => {
      console.log(`  ID: ${apt.id} | Type: "${apt.type}" | Title: "${apt.title}"`);
    });

    const { rows: virtualRows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE type IN ('telemedicine', 'virtual-consultation', 'virtual')
    `);

    console.log(`\n🎯 Virtual appointments available: ${virtualRows[0]?.count ?? 0}`);

    console.log('\n✅ Database check complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

quickTest();
