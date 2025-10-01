import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { users } from '@/db/schema';
import { createAuditLogFromRequest, SYSTEM_USER_ID } from '@/lib/audit-logger';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// POST /api/users-with-audit - Create a user with audit logging
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    const { name, email, password, username, role, practiceId, phone, address } = body;

    // Validate required fields
    if (!name || !email || !password || !username || !role) {
      await createAuditLogFromRequest(request, {
        action: 'CREATE',
        recordType: 'USER',
        description: `Failed to create user - missing required fields`,
        userId: SYSTEM_USER_ID,
        practiceId: practiceId || undefined,
        metadata: { 
          error: 'validation_failed',
          missingFields: [!name && 'name', !email && 'email', !password && 'password', !username && 'username', !role && 'role'].filter(Boolean)
        }
      });

      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await tenantDb
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      await createAuditLogFromRequest(request, {
        action: 'CREATE',
        recordType: 'USER',
        description: `Failed to create user - email already exists: ${email}`,
        userId: SYSTEM_USER_ID,
        practiceId: practiceId || undefined,
        metadata: { 
          error: 'duplicate_email',
          email: email,
          existingUserId: existingUser[0].id
        }
      });

      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user
    const newUser = await tenantDb
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        username,
        role: role as any,
        practiceId: practiceId ? Number(practiceId) : undefined,
        phone,
        address,
      })
      .returning();

    const createdUser = newUser[0];

    // Log successful user creation
    await createAuditLogFromRequest(request, {
      action: 'CREATE',
      recordType: 'USER',
      recordId: createdUser.id.toString(),
      description: `Created new user: ${createdUser.name} (${createdUser.email})`,
      userId: SYSTEM_USER_ID, // In a real app, this would be the current user's ID
      practiceId: createdUser.practiceId?.toString(),
      metadata: {
        userName: createdUser.name,
        userEmail: createdUser.email,
        userRole: createdUser.role,
        practiceId: createdUser.practiceId
      },
      changes: {
        before: undefined,
        after: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          practiceId: createdUser.practiceId
        }
      }
    });

    // Remove password from response
    const { password: _, ...userResponse } = createdUser;

    return NextResponse.json({
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Error creating user:', error);

    // Log the error
    await createAuditLogFromRequest(request, {
      action: 'CREATE',
      recordType: 'USER',
      description: `Failed to create user - system error`,
      userId: SYSTEM_USER_ID,
      metadata: { 
        error: 'system_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// GET /api/users-with-audit - Get users with audit logging
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('practiceId');

    // Log the view action
    await createAuditLogFromRequest(request, {
      action: 'VIEW',
      recordType: 'USER',
      description: `Viewed users list${practiceId ? ` for practice ${practiceId}` : ''}`,
      userId: SYSTEM_USER_ID, // In a real app, this would be the current user's ID
      practiceId: practiceId || undefined,
      metadata: {
        operation: 'list_users',
        filters: { practiceId }
      }
    });

    // Fetch users
    const usersList = await tenantDb.select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      role: users.role,
      practiceId: users.practiceId,
      phone: users.phone,
      address: users.address,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users)
    .where(practiceId ? eq(users.practiceId, Number(practiceId)) : undefined);

    return NextResponse.json({
      users: usersList,
      count: usersList.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);

    // Log the error
    await createAuditLogFromRequest(request, {
      action: 'VIEW',
      recordType: 'USER',
      description: `Failed to view users - system error`,
      userId: SYSTEM_USER_ID,
      metadata: { 
        error: 'system_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
