// Database migration script to create audit_logs table
// Run this script to set up the audit logging system

import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function createAuditLogsTable() {
  try {
    console.log('Creating audit_logs table...');
    
    // Create the audit_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        user_id TEXT,
        action TEXT NOT NULL,
        record_type TEXT NOT NULL,
        record_id TEXT,
        description TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB,
        changes JSONB,
        reason TEXT,
        practice_id TEXT,
        organization_id TEXT,
        version TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    console.log('Creating indexes for audit_logs table...');
    
    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_record_type ON audit_logs(record_type);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_practice_id ON audit_logs(practice_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_compound ON audit_logs(record_type, action, timestamp DESC);`);

    console.log('✅ Audit logs table and indexes created successfully');
    return { success: true, message: 'Audit logs table created successfully' };
  } catch (error) {
    console.error('❌ Error creating audit logs table:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  createAuditLogsTable().then((result) => {
    console.log(result);
    process.exit(result.success ? 0 : 1);
  });
}
