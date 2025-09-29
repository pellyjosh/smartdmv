import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { auditLogs, type AuditLog } from '@/db/schema';
import { and, eq, gte, lte, ilike, desc } from 'drizzle-orm';

// GET /api/audit-logs/[recordType]/export - Export audit logs as CSV
export async function GET(
  request: NextRequest,
  { params }: { params: { recordType: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
  const { searchParams } = new URL(request.url);
  const { recordType } = (await params) as { recordType: string };
    
    // Extract query parameters
    const search = searchParams.get('search');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the where clause
    const whereConditions = [];
    
    // Filter by record type (unless it's 'all')
    if (recordType && recordType !== 'all') {
      whereConditions.push(eq(auditLogs.recordType, recordType.toUpperCase()));
    }
    
    // Filter by action
    if (action && action !== 'all') {
      whereConditions.push(eq(auditLogs.action, action.toUpperCase()));
    }
    
    // Filter by search term (search in description)
    if (search) {
      whereConditions.push(ilike(auditLogs.description, `%${search}%`));
    }
    
    // Filter by date range
    if (startDate) {
      whereConditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }
    
    if (endDate) {
      whereConditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    // Execute the query
    const logs = await db
      .select({
        id: auditLogs.id,
        timestamp: auditLogs.timestamp,
        userId: auditLogs.userId,
        action: auditLogs.action,
        recordType: auditLogs.recordType,
        recordId: auditLogs.recordId,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        reason: auditLogs.reason,
        practiceId: auditLogs.practiceId,
        organizationId: auditLogs.organizationId,
      })
      .from(auditLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(1000); // Limit to 1000 results for CSV export

    // Generate CSV content
    const csvHeaders = [
      'ID',
      'Timestamp',
      'User ID',
      'Action',
      'Record Type',
      'Record ID',
      'Description',
      'IP Address',
      'User Agent',
      'Reason',
      'Practice ID',
      'Organization ID'
    ];

  const csvRows = (logs as AuditLog[]).map((log: AuditLog) => [
      log.id,
      log.timestamp?.toISOString() || '',
      log.userId || '',
      log.action || '',
      log.recordType || '',
  log.recordId || '',
  String(log.description || '').replace(/"/g, '""'), // Escape quotes
  log.ipAddress || '',
  String(log.userAgent || '').replace(/"/g, '""'), // Escape quotes
  String(log.reason || '').replace(/"/g, '""'), // Escape quotes
  log.practiceId || '',
  log.organizationId || ''
    ]);

    // Create CSV string
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
    ].join('\n');

    // Return CSV response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${recordType}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
