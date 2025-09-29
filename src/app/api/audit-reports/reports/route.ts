import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { auditLogs, type AuditLog } from '@/db/schema';
import { and, eq, gte, lte, desc, sql, count } from 'drizzle-orm';

// GET /api/audit-reports/reports - Generate audit reports
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const recordType = searchParams.get('recordType');
    const userId = searchParams.get('userId');
    const practiceId = searchParams.get('practiceId');
    const organizationId = searchParams.get('organizationId');
    const action = searchParams.get('action');
    const groupBy = searchParams.get('groupBy') || 'day';
    const format = searchParams.get('format') || 'json';

    // Build the where clause
    const whereConditions = [];
    
    // Filter by record type
    if (recordType && recordType !== 'ALL') {
      whereConditions.push(eq(auditLogs.recordType, recordType));
    }
    
    // Filter by action
    if (action && action !== 'ALL') {
      whereConditions.push(eq(auditLogs.action, action));
    }
    
    // Filter by user ID
    if (userId) {
      whereConditions.push(eq(auditLogs.userId, userId));
    }
    
    // Filter by practice ID
    if (practiceId) {
      whereConditions.push(eq(auditLogs.practiceId, practiceId));
    }
    
    // Filter by organization ID
    if (organizationId) {
      whereConditions.push(eq(auditLogs.organizationId, organizationId));
    }
    
    // Filter by date range
    if (startDate) {
      whereConditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }
    
    if (endDate) {
      whereConditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    // Execute the query based on groupBy parameter
    let result: any = {};
    
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      // Time-based grouping
      let dateFormat: string;
      switch (groupBy) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }
      
  const logs = (await db
        .select({
          id: auditLogs.id,
          timestamp: auditLogs.timestamp,
          userId: auditLogs.userId,
          action: auditLogs.action,
          recordType: auditLogs.recordType,
          recordId: auditLogs.recordId,
          description: auditLogs.description,
          practiceId: auditLogs.practiceId,
          organizationId: auditLogs.organizationId,
        })
        .from(auditLogs)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(auditLogs.timestamp))
  .limit(1000)) as AuditLog[];

      // Group the results by time period
  result = logs.reduce((acc: any, log: AuditLog) => {
        const date = new Date(log.timestamp);
        let key: string;
        
        switch (groupBy) {
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
            key = `Week of ${weekStart.toISOString().split('T')[0]}`;
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(log);
        return acc;
      }, {});
      
    } else {
      // Non-time-based grouping (user, action, recordType)
  const logs = (await db
        .select({
          id: auditLogs.id,
          timestamp: auditLogs.timestamp,
          userId: auditLogs.userId,
          action: auditLogs.action,
          recordType: auditLogs.recordType,
          recordId: auditLogs.recordId,
          description: auditLogs.description,
          practiceId: auditLogs.practiceId,
          organizationId: auditLogs.organizationId,
        })
        .from(auditLogs)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(auditLogs.timestamp))
  .limit(1000)) as AuditLog[];

      // Group the results by the specified field
  result = logs.reduce((acc: any, log: AuditLog) => {
        let key: string;
        
        switch (groupBy) {
          case 'user':
            key = String(log.userId ?? 'Unknown User');
            break;
          case 'action':
            key = String(log.action ?? 'Unknown Action');
            break;
          case 'recordType':
            key = String(log.recordType ?? 'Unknown Record Type');
            break;
          default:
            key = 'All Records';
        }
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(log);
        return acc;
      }, {});
    }

    // Handle CSV format
    if (format === 'csv') {
      const csvHeaders = [
        'Group',
        'ID',
        'Timestamp',
        'User ID',
        'Action',
        'Record Type',
        'Record ID',
        'Description',
        'Practice ID',
        'Organization ID'
      ];

      const csvRows: any[] = [];
      Object.entries(result).forEach(([group, logs]: [string, any]) => {
        logs.forEach((log: any) => {
          csvRows.push([
            group,
            log.id,
            log.timestamp?.toISOString() || '',
            log.userId || '',
            log.action || '',
            log.recordType || '',
            log.recordId || '',
            (log.description || '').replace(/"/g, '""'),
            log.practiceId || '',
            log.organizationId || ''
          ]);
        });
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating audit reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate audit reports' },
      { status: 500 }
    );
  }
}
