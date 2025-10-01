import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { auditLogs, type AuditLog, type NewAuditLog } from '@/db/schema';
import { sql } from 'drizzle-orm';

// POST /api/audit-logs/test - Create test audit logs for development
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const sampleAuditLogs = [
      {
        action: 'CREATE',
        recordType: 'permission_override',
        recordId: 'test-1',
        description: 'Created permission override for user access - Test Data',
        userId: '1',
        practiceId: '1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        metadata: { module: 'permissions', level: 'admin', test: true },
        changes: { before: null, after: { canAccess: true } }
      },
      {
        action: 'update',
        recordType: 'user_role_assignment',
        recordId: 'test-2',
        description: 'Updated user role assignment - Test Data',
        userId: '2',
        practiceId: '1',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        metadata: { module: 'users', role: 'veterinarian', test: true },
        changes: { before: { role: 'technician' }, after: { role: 'veterinarian' } }
      },
      {
        action: 'create',
        recordType: 'soap_note',
        recordId: 'test-3',
        description: 'Created SOAP note for patient - Test Data',
        userId: '3',
        practiceId: '1',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        metadata: { patientId: '123', templateId: '456', test: true },
        changes: { before: null, after: { noteId: '3', content: 'Patient examination completed' } }
      },
      {
        action: 'view',
        recordType: 'lab_result',
        recordId: 'test-4',
        description: 'Viewed lab results - Test Data',
        userId: '1',
        practiceId: '1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        metadata: { labId: '789', testType: 'blood_work', test: true }
      },
      {
        action: 'delete',
        recordType: 'role',
        recordId: 'test-5',
        description: 'Deleted role - Test Data',
        userId: '2',
        practiceId: '1',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        metadata: { roleType: 'custom_role', test: true },
        changes: { before: { roleName: 'custom_role' }, after: null }
      },
      {
        action: 'lock',
        recordType: 'vaccination',
        recordId: 'test-6',
        description: 'Locked vaccination record - Test Data',
        userId: '3',
        practiceId: '1',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        metadata: { vaccinationId: '999', test: true },
        changes: { before: { locked: false }, after: { locked: true } }
      }
    ];

    // Insert multiple test audit logs
    const insertedLogs: AuditLog[] = [];

    for (const logData of sampleAuditLogs as NewAuditLog[]) {
      const result = await tenantDb.insert(auditLogs).values(logData).returning();
      insertedLogs.push(result[0] as AuditLog);
    }

    return NextResponse.json({
      message: 'Test audit logs created successfully',
      count: insertedLogs.length,
      logs: insertedLogs
    });
  } catch (error) {
    console.error('Error creating test audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to create test audit logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/audit-logs/test - Delete test audit logs
export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    // Delete all audit logs that have test: true in metadata
    const deletedLogs = await tenantDb
      .delete(auditLogs)
      .where(sql`metadata->>'test' = 'true'`)
      .returning();

    return NextResponse.json({
      message: 'Test audit logs deleted successfully',
      count: deletedLogs.length
    });
  } catch (error) {
    console.error('Error deleting test audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete test audit logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
