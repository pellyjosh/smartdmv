import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { db } from '@/db/index';
import { dashboardConfigs } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

// GET /api/admin/dashboard-configs - Get dashboard configurations for the user
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dashboard configs for the user
    const configs = await db.query.dashboardConfigs.findMany({
      where: (dashboardConfigs, { eq, and, or }) => and(
        eq(dashboardConfigs.userId, userPractice.userId),
        or(
          eq(dashboardConfigs.practiceId, userPractice.practiceId),
          eq(dashboardConfigs.practiceId, null) // Global configs
        )
      ),
      orderBy: (dashboardConfigs, { asc, desc }) => [desc(dashboardConfigs.isDefault), desc(dashboardConfigs.updated_at)]
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching dashboard configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard configurations' },
      { status: 500 }
    );
  }
}

// POST /api/admin/dashboard-configs - Create a new dashboard configuration
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    console.log("POST dashboard-configs - received body:", body);
    console.log("POST dashboard-configs - userPractice:", userPractice);
    
    // Validate required fields
    if (!body.name || !body.config) {
      return NextResponse.json(
        { error: 'Name and config are required' },
        { status: 400 }
      );
    }

    // If this is being set as default, unset all other defaults for this user/practice
    if (body.isDefault) {
      await (db as any)
        .update(dashboardConfigs)
        .set({ isDefault: false })
        .where(
          and(
            eq(dashboardConfigs.userId, userPractice.userId),
            or(
              eq(dashboardConfigs.practiceId, userPractice.practiceId),
              eq(dashboardConfigs.practiceId, null)
            )
          )
        );
    }

    // Insert new config
    const newConfig = await (db as any)
      .insert(dashboardConfigs)
      .values({
        name: body.name,
        userId: userPractice.userId,
        practiceId: body.practiceId || userPractice.practiceId,
        config: typeof body.config === 'string' ? body.config : JSON.stringify(body.config),
        role: body.role || null,
        isDefault: body.isDefault || false,
      })
      .returning();

    return NextResponse.json(newConfig[0], { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard configuration' },
      { status: 500 }
    );
  }
}
