import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { dashboardConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/admin/dashboard-configs/[id] - Get specific dashboard configuration
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = parseInt(params.id);
    if (isNaN(configId)) {
      return NextResponse.json({ error: 'Invalid config ID' }, { status: 400 });
    }

    const config = await tenantDb.query.dashboardConfigs.findFirst({
      where: (dashboardConfigs, { eq, and }) => and(
        eq(dashboardConfigs.id, configId),
        eq(dashboardConfigs.userId, userPractice.userId)
      )
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard configuration' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/dashboard-configs/[id] - Update dashboard configuration
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = parseInt(params.id);
    if (isNaN(configId)) {
      return NextResponse.json({ error: 'Invalid config ID' }, { status: 400 });
    }

    const body = await request.json();

    // Check if config exists and belongs to user
    const existingConfig = await tenantDb.query.dashboardConfigs.findFirst({
      where: (dashboardConfigs, { eq, and }) => and(
        eq(dashboardConfigs.id, configId),
        eq(dashboardConfigs.userId, userPractice.userId)
      )
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // If setting as default, unset all other defaults for this user
    if (body.isDefault) {
      await (db as any)
        .update(dashboardConfigs)
        .set({ isDefault: false })
        .where(eq(dashboardConfigs.userId, userPractice.userId));
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.config !== undefined) {
      updateData.config = typeof body.config === 'string' ? body.config : JSON.stringify(body.config);
    }
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (body.role !== undefined) updateData.role = body.role;

    // Update the config
    const updatedConfig = await (db as any)
      .update(dashboardConfigs)
      .set(updateData)
      .where(eq(dashboardConfigs.id, configId))
      .returning();

    return NextResponse.json(updatedConfig[0]);
  } catch (error) {
    console.error('Error updating dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/dashboard-configs/[id] - Delete dashboard configuration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = parseInt(params.id);
    if (isNaN(configId)) {
      return NextResponse.json({ error: 'Invalid config ID' }, { status: 400 });
    }

    // Check if config exists and belongs to user
    const existingConfig = await tenantDb.query.dashboardConfigs.findFirst({
      where: (dashboardConfigs, { eq, and }) => and(
        eq(dashboardConfigs.id, configId),
        eq(dashboardConfigs.userId, userPractice.userId)
      )
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Don't allow deleting the only config or a default config if it's the only one
    const userConfigs = await tenantDb.query.dashboardConfigs.findMany({
      where: (dashboardConfigs, { eq }) => eq(dashboardConfigs.userId, userPractice.userId)
    });

    if (userConfigs.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only dashboard configuration' },
        { status: 400 }
      );
    }

    // Delete the config
    await (db as any)
      .delete(dashboardConfigs)
      .where(eq(dashboardConfigs.id, configId));

    return NextResponse.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard configuration' },
      { status: 500 }
    );
  }
}
