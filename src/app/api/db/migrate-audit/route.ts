import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// POST /api/db/migrate-audit - Create the audit_logs table if it doesn't exist
export async function POST(request: NextRequest) {
  try {
    // Check if the audit_logs table exists
    const tableExistsResult = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )`
    );
    
    const tableExists = tableExistsResult.rows[0]?.exists;

    if (tableExists) {
      return NextResponse.json({
        message: 'audit_logs table already exists',
        exists: true
      });
    }

    // Create the audit_logs table
    await db.execute(sql`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "timestamp" timestamp DEFAULT now() NOT NULL,
        "user_id" text,
        "action" text NOT NULL,
        "record_type" text NOT NULL,
        "record_id" text,
        "description" text,
        "ip_address" text,
        "user_agent" text,
        "metadata" jsonb,
        "changes" jsonb,
        "reason" text,
        "practice_id" text,
        "organization_id" text,
        "version" text,
        "is_active" boolean DEFAULT true
      )
    `);

    // Create indexes for better query performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_record_type ON audit_logs(record_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_practice_id ON audit_logs(practice_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_compound ON audit_logs(record_type, action, timestamp DESC)`);

    return NextResponse.json({
      message: 'audit_logs table created successfully with indexes',
      exists: false,
      created: true
    });
  } catch (error) {
    console.error('Error creating audit_logs table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create audit_logs table', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET /api/db/migrate-audit - Check if the audit_logs table exists
export async function GET(request: NextRequest) {
  try {
    const tableExistsResult = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )`
    );
    
    const tableExists = tableExistsResult.rows[0]?.exists;

    // If table exists, also check the count
    let count = 0;
    if (tableExists) {
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM audit_logs`);
      count = Number(countResult.rows[0]?.count || 0);
    }

    return NextResponse.json({
      tableExists,
      recordCount: count,
      message: tableExists 
        ? `audit_logs table exists with ${count} records` 
        : 'audit_logs table does not exist'
    });
  } catch (error) {
    console.error('Error checking audit_logs table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check audit_logs table', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
