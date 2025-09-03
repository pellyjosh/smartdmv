import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { SYSTEM_USER_NAME, SYSTEM_USER_ID } from '@/lib/audit-logger';
import { and, eq, gte, lte, sql, count } from 'drizzle-orm';

// GET /api/audit-reports/statistics - Generate audit statistics
export async function GET(request: NextRequest) {
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

    // Get all logs matching the criteria
    const logs = await db
      .select({
        action: auditLogs.action,
        recordType: auditLogs.recordType,
        userId: auditLogs.userId,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Calculate statistics
    const totalLogs = logs.length;
    
    // Action distribution
    const actionDistribution = logs.reduce((acc: any, log: any) => {
      const action = log.action || 'Unknown';
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});

    // Record type distribution
    const recordTypeDistribution = logs.reduce((acc: any, log: any) => {
      const recordType = log.recordType || 'Unknown';
      acc[recordType] = (acc[recordType] || 0) + 1;
      return acc;
    }, {});

    // User distribution
    const userDistribution = logs.reduce((acc: any, log: any) => {
  const userId = log.userId || SYSTEM_USER_ID;
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {});

    // Hourly distribution
    const hourlyDistribution = logs.reduce((acc: any, log: any) => {
      if (log.timestamp) {
        const hour = new Date(log.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {});

    // Unique users count
    const uniqueUsers = new Set(logs.map((log: any) => log.userId).filter(Boolean)).size;

    const statistics = {
      totalLogs,
      uniqueUsers,
      actionDistribution,
      recordTypeDistribution,
      userDistribution,
      hourlyDistribution,
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error generating audit statistics:', error);
    return NextResponse.json(
      { error: 'Failed to generate audit statistics' },
      { status: 500 }
    );
  }
}
