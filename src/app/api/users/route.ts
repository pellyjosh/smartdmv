// src/app/api/users/routes.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { users, UserRoleEnum } from '@/db/schema'; // Import UserRoleEnum
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { logView, logCreate } from '@/lib/audit-logger';
import { getUserContextFromRequest } from '@/lib/auth-context';

// GET all users, users by practiceId, or a specific user by ID
export async function GET(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const selectParam = searchParams.get('select');
  const practiceIdParam = searchParams.get('practiceId');
  const userIdParam = pathname.split('/').pop(); // Extract user ID from the URL path if present
  const practiceId = practiceIdParam ? parseInt(practiceIdParam, 10) : undefined;
  const userId = userIdParam && userIdParam !== 'users' ? parseInt(userIdParam, 10) : undefined;

  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  console.log('Pathname:', pathname);
  console.log('Extracted User ID:', userId);
  console.log('Query select param:', selectParam);
  console.log('Query practiceId param:', practiceIdParam);

  try {
    console.log('Request URL:', (request as any).url ?? (request as any).nextUrl?.href);
    // log minimal headers info to help debug auth-related fallbacks
    try {
      const headersObj = (request as any).headers ? Object.fromEntries((request as any).headers.entries()) : {};
      console.log('Request headers keys:', Object.keys(headersObj).slice(0, 20));
    } catch (hErr) {
      // ignore header logging errors
    }
    // Log audit for viewing sensitive user data
    const auditUserContext = await getUserContextFromRequest(request);

    if (Number.isFinite(userId as number)) {
      const userData = await tenantDb.select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        practiceId: users.practiceId,
        phone: users.phone,
        address: users.address,
        city: users.city,
        state: users.state,
        zipCode: users.zipCode,
        country: users.country,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(eq(users.id, userId as number)).limit(1);
      if (userData.length === 0) {
        console.log('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Log viewing individual user data
      if (auditUserContext) {
        await logView(
          request as any,
          'USER',
          userId!.toString(),
          auditUserContext.userId,
          auditUserContext.practiceId,
          { viewType: 'individual', targetUserId: userId }
        );
      }

      return NextResponse.json(userData[0], { status: 200 });
    }

    let usersData;
    // support a simple `select` query param for common fields to reduce payloads
    const allowedFields = ['id', 'name', 'email', 'role'];
    if (selectParam) {
      const fields = selectParam.split(',').map(s => s.trim()).filter(f => allowedFields.includes(f));
      if (fields.length > 0) {
        // build a simple select object mapping
        const selectObj: Record<string, any> = {};
        for (const f of fields) {
          selectObj[f] = (users as any)[f];
        }
        try {
          usersData = Number.isFinite(practiceId as number)
            ? await tenantDb.select(selectObj).from(users).where(eq(users.practiceId, practiceId as number))
            : await tenantDb.select(selectObj).from(users);
        } catch (selectErr) {
          console.error('Failed to apply select projection, falling back to base projection. selectParam:', selectParam, 'selectObj:', selectObj, 'error:', selectErr);
          const baseSelect = {
            id: users.id,
            name: users.name,
            email: users.email,
            username: users.username,
            role: users.role,
            practiceId: users.practiceId,
            phone: users.phone,
            address: users.address,
            city: users.city,
            state: users.state,
            zipCode: users.zipCode,
            country: users.country,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          };
          usersData = Number.isFinite(practiceId as number)
            ? await tenantDb.select(baseSelect).from(users).where(eq(users.practiceId, practiceId as number))
            : await tenantDb.select(baseSelect).from(users);
        }
      } else {
        usersData = Number.isFinite(practiceId as number)
          ? await tenantDb.select().from(users).where(eq(users.practiceId, practiceId as number))
          : await tenantDb.select().from(users);
      }
    } else {
      const baseSelect = {
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        practiceId: users.practiceId,
        phone: users.phone,
        address: users.address,
        city: users.city,
        state: users.state,
        zipCode: users.zipCode,
        country: users.country,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      };
      usersData = Number.isFinite(practiceId as number)
        ? await tenantDb.select(baseSelect).from(users).where(eq(users.practiceId, practiceId as number))
        : await tenantDb.select(baseSelect).from(users);
    }

  // (Removed automatic audit logging for listing users to avoid noisy logs on page refresh)

    return NextResponse.json(usersData, { status: 200 });
  } catch (error) {
  console.error('Error fetching users:', error instanceof Error ? error.message : error);
  if (error instanceof Error && (error as any).stack) console.error((error as any).stack);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Create a new user (registration)
export async function POST(req: NextRequest) {
  try {
    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();
    
    const body = await req.json();
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      username: z.string().min(3),
      password: z.string().min(6),
      // Accept any value from the canonical UserRoleEnum (includes PRACTICE_STAFF etc)
      role: z.nativeEnum(UserRoleEnum).default(UserRoleEnum.CLIENT),
      practiceId: z.coerce.number(), // Convert string to number
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      emergencyContactRelationship: z.string().optional(),
    });

    // Debug logs to help trace validation issues when creating users
    try {
      console.log('Incoming user create body:', body);
      console.log('UserRoleEnum values:', Object.values(UserRoleEnum));
      console.log('Incoming role value:', body?.role);
      const validatedData = userSchema.parse(body);
      console.log('Validated user data:', validatedData);

      // proceed with creation using validatedData

      // Check for existing user with same email or username
      const existingUser = await tenantDb.query.users.findFirst({
        where: and(
          eq(users.email, validatedData.email),
          eq(users.username, validatedData.username),
        )
      })

      if (existingUser) {
        return NextResponse.json({ error: "User with this email or username already exists" }, { status: 400 });
      }

      const [newUser] = await tenantDb.insert(users).values(validatedData).returning();

      // Log user creation audit
      const auditUserContext = await getUserContextFromRequest(req);
      if (auditUserContext) {
        await logCreate(
          req as any,
          'USER',
          newUser.id.toString(),
          {
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            practiceId: newUser.practiceId
          },
          auditUserContext.userId,
          newUser.practiceId?.toString(),
          undefined,
          {
            createdBy: auditUserContext.name || auditUserContext.email,
            registrationMethod: 'api'
          }
        );
      }

      return NextResponse.json(newUser, { status: 201 });
    } catch (parseError) {
      console.error('Error creating user:', parseError);
      if (parseError instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: parseError.errors }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
