import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { auditLogs, type AuditLog } from '@/db/schema';
import { and, eq, gte, lte, ilike, desc } from 'drizzle-orm';

// GET /api/audit-logs/[recordType] - Fetch audit logs by record type
export async function GET(
  request: NextRequest,
  { params }: { params: { recordType: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
  const { searchParams } = new URL(request.url);
  // `params` may be a promise-like in Next.js dynamic API routes — await it before using
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
  const logs = await tenantDb
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
        metadata: auditLogs.metadata,
        changes: auditLogs.changes,
        reason: auditLogs.reason,
        practiceId: auditLogs.practiceId,
        organizationId: auditLogs.organizationId,
        version: auditLogs.version,
        isActive: auditLogs.isActive,
      })
      .from(auditLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(100); // Limit to 100 results for performance

    // For now, return mock data structure with user info
    // In a real implementation, you would join with the users table
    const logsWithUserInfo: (AuditLog & { user?: { name: string } | null })[] = logs.map((log: AuditLog) => ({
      ...log,
      user: log.userId ? { name: `User ${log.userId}` } : null
    }));

    return NextResponse.json(logsWithUserInfo);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
