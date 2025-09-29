#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { Pool } from 'pg';

async function testDatabaseConnection() {
  // Disable TLS certificate verification for AWS RDS
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('🔧 Disabled TLS certificate verification for AWS RDS');
  
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = 'tenant_smartvett'; // Test tenant DB
  
  console.log('\nTesting database connection...');
  console.log(`Host: ${dbHost}`);
  console.log(`Port: ${dbPort}`);
  console.log(`User: ${dbUser}`);
  console.log(`Database: ${dbName}`);
  
  if (!dbHost || !dbUser || !dbPassword) {
    console.error('❌ Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD');
    process.exit(1);
  }
  
  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?sslmode=require`;
  
  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('\n🔍 Testing connection...');
    const start = Date.now();
    
    const client = await pool.connect();
    const connectTime = Date.now() - start;
    console.log(`✅ Connected successfully in ${connectTime}ms`);
    
    console.log('\n🔍 Testing query...');
    const queryStart = Date.now();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    const queryTime = Date.now() - queryStart;
    
    console.log(`✅ Query executed successfully in ${queryTime}ms`);
    console.log(`📅 Database time: ${result.rows[0].current_time}`);
    console.log(`🗃️ PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // Test a simple sessions query
    console.log('\n🔍 Testing sessions table...');
    const sessionStart = Date.now();
    const sessionResult = await client.query('SELECT COUNT(*) as session_count FROM sessions');
    const sessionTime = Date.now() - sessionStart;
    
    console.log(`✅ Sessions query executed in ${sessionTime}ms`);
    console.log(`👥 Total sessions: ${sessionResult.rows[0].session_count}`);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Database connection failed:', error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('💡 This appears to be a timeout issue. Check:');
      console.error('   - Network connectivity to the database');
      console.error('   - Database server load');
      console.error('   - Firewall settings');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Check:');
      console.error('   - Database server is running');
      console.error('   - Host and port are correct');
      console.error('   - Network connectivity');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Host not found. Check:');
      console.error('   - Database host URL is correct');
      console.error('   - DNS resolution is working');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testDatabaseConnection().catch(console.error);
