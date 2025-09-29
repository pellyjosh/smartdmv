// src/app/api/owner/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ownerDb } from '@/db/owner-db.config';
import { tenants, tenantUsage } from '@/db/owner-schema';
import { count, eq, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'OWNER' && user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate date for monthly growth (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all statistics from owner database
    const [
      totalTenantsResult,
      activeTenantsResult,
      recentTenantsResult,
    ] = await Promise.all([
      ownerDb.select({ count: count() }).from(tenants),
      ownerDb
        .select({ count: count() })
        .from(tenants)
        .where(eq(tenants.status, 'ACTIVE')),
      ownerDb
        .select({ count: count() })
        .from(tenants)
        .where(gte(tenants.createdAt, thirtyDaysAgo))
    ]);

    // Get usage statistics from tenant usage table
    const usageStats = await ownerDb
      .select()
      .from(tenantUsage)
      .limit(1000); // Get recent usage data

    const totalTenants = totalTenantsResult[0]?.count || 0;
    const activeTenants = activeTenantsResult[0]?.count || 0;
    const recentTenants = recentTenantsResult[0]?.count || 0;
    
    // Aggregate usage statistics
    const totalUsers = usageStats.reduce((sum, usage) => sum + usage.userCount, 0);
    const totalPractices = usageStats.reduce((sum, usage) => sum + usage.practiceCount, 0);

    // Calculate monthly growth percentage
    const monthlyGrowth = totalTenants > 0 
      ? Math.round((recentTenants / totalTenants) * 100) 
      : 0;

    // Calculate total storage used
    let totalStorageBytes = 0;
    usageStats.forEach(usage => {
      const storageStr = usage.storageUsed;
      if (storageStr && storageStr !== '0') {
        // Parse storage string like '1.5GB' -> bytes
        const match = storageStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          const multipliers: { [key: string]: number } = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024,
            'TB': 1024 * 1024 * 1024 * 1024
          };
          totalStorageBytes += value * (multipliers[unit] || 1);
        }
      }
    });

    // Convert back to human readable
    const formatStorage = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const storageUsed = formatStorage(totalStorageBytes);

    return NextResponse.json({
      totalTenants,
      activeTenants,
      totalUsers,
      totalPractices,
      storageUsed,
      monthlyGrowth,
      recentTenants,
    });

  } catch (error) {
    console.error('Error fetching owner stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
