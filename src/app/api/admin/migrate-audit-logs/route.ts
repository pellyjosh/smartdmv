import { NextRequest, NextResponse } from 'next/server';
import { createAuditLogsTable } from '@/db/migrate-audit-logs';

// POST /api/admin/migrate-audit-logs - Run audit logs table migration
export async function POST(request: NextRequest) {
  try {
    const result = await createAuditLogsTable();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/migrate-audit-logs - Check if audit logs table exists
export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/db');
    const { sql } = await import('drizzle-orm');
    
    // Check if the table exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    const tableExists = result.rows[0]?.exists || false;
    
    return NextResponse.json({
      tableExists,
      message: tableExists ? 'Audit logs table exists' : 'Audit logs table does not exist'
    });
  } catch (error) {
    console.error('Error checking table:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
