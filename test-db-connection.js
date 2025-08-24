const { Pool } = require('pg');
require('dotenv').config();

// For AWS RDS with self-signed certificates, disable TLS rejection
if (process.env.DATABASE_URL?.includes('amazonaws.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('Disabled TLS certificate verification for AWS RDS');
}

async function testConnection() {
  console.log('Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }

  // Normalize connection string (same as your app)
  function normalizeConnectionString(conn) {
    try { new URL(conn); return conn; } catch (e) {}
    const m = conn.match(/^([^:]+:\/\/)([^@]+)@(.*)$/);
    if (m) {
      const [, scheme, userinfo, rest] = m;
      const parts = userinfo.split(':');
      if (parts.length >= 2) {
        const user = parts.shift();
        const pass = parts.join(':');
        const encPass = encodeURIComponent(pass);
        return `${scheme}${user}:${encPass}@${rest}`;
      }
    }
    return conn;
  }

  const connectionString = normalizeConnectionString(process.env.DATABASE_URL);
  console.log('Using connection string pattern:', connectionString.replace(/:[^:@]*@/, ':***@'));

  // Configure SSL (same as your app)
  const poolConfig = { connectionString };
  if (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')) {
    poolConfig.ssl = { rejectUnauthorized: false };
    console.log('SSL configured with rejectUnauthorized: false');
  }

  const pool = new Pool(poolConfig);

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database!');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Connection test completed successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  }
}

testConnection();
