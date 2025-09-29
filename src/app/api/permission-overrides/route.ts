import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { users } from '@/db/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { permissionOverrides } from '@/db/schemas/permissionOverridesSchema';
import { createAuditLogFromRequest, SYSTEM_USER_ID, SYSTEM_USER_NAME } from '@/lib/audit-logger';
import { getUserContextFromRequest } from '@/lib/auth-context';


// GET permission overrides for a practice
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // Query database for permission overrides for this practice
    const results = await tenantDb.select().from(permissionOverrides).where(eq(permissionOverrides.practiceId, parseInt(practiceId)));

    const overrides = results.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      resource: row.resource,
      action: row.action,
      granted: row.granted,
      reason: row.reason,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      createdBy: row.createdBy,
      status: row.status
    }));

    return NextResponse.json(overrides);
  } catch (error) {
    console.error('Error fetching permission overrides:', error);
    return NextResponse.json({ error: 'Failed to fetch permission overrides' }, { status: 500 });
  }
}

// POST create permission override
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    
    const overrideSchema = z.object({
      userId: z.string(),
      resource: z.string(),
      action: z.string(),
      granted: z.boolean(),
      reason: z.string().min(10),
      expiresAt: z.string().nullable().optional(),
      practiceId: z.number()
    });

    const validatedData = overrideSchema.parse(body);

    // Get user details
    const user = await db
      .select({
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, parseInt(validatedData.userId as string)))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resolve current user from request (for createdBy and audit userId)
    const userContext = await getUserContextFromRequest(request);
  const auditUserId = userContext?.userId ?? SYSTEM_USER_ID;
  const createdByName = userContext?.name || userContext?.email || SYSTEM_USER_NAME;

    // Insert into database. Let the DB generate the numeric primary key (id).
    const insertData = {
      userId: String(validatedData.userId),
      userName: String(user[0].name || 'Unknown User'),
      userEmail: String(user[0].email || ''),
      resource: String(validatedData.resource),
      action: String(validatedData.action),
      granted: Boolean(validatedData.granted),
      reason: String(validatedData.reason),
      expiresAt: validatedData.expiresAt ? new Date(String(validatedData.expiresAt)) : null,
      practiceId: Number(validatedData.practiceId),
      createdAt: new Date(),
      createdBy: createdByName,
      status: 'active'
    };

    // Use returning() to get the DB-generated id
    const [inserted] = await tenantDb.insert(permissionOverrides).values(insertData as any).returning();
    const id = String(inserted.id);

    // Create audit log entry (non-blocking)
    try {
      await createAuditLogFromRequest(request, {
        action: 'CREATE',
        recordType: 'PERMISSION_OVERRIDE',
        recordId: id,
        description: `Created permission override for user ${user[0].name} (${user[0].email})`,
        userId: auditUserId,
        practiceId: String(validatedData.practiceId),
        metadata: { resource: validatedData.resource, action: validatedData.action }
      });
    } catch (err) {
      console.error('Audit log error (non-blocking):', err);
    }

    const created = {
      id,
      userId: validatedData.userId,
      userName: user[0].name || 'Unknown User',
      userEmail: user[0].email,
      resource: validatedData.resource,
      action: validatedData.action,
      granted: validatedData.granted,
      reason: validatedData.reason,
      expiresAt: validatedData.expiresAt,
      createdAt: (inserted.createdAt || new Date()).toISOString(),
      createdBy: inserted.createdBy || createdByName,
      status: inserted.status || 'active'
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating permission override:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create permission override' }, { status: 500 });
  }
}
