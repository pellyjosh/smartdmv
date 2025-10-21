// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { users, practices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
// (no cookie/session creation here)

// Zod schema for registration input validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  // Accept string or number, normalize to number later
  practiceId: z.union([z.string().min(1), z.number()]),
  // Optional profile fields
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

// Note: this route only handles creation of client users.

export async function POST(req: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  console.log('[API Register START] Received request to /api/auth/register');
  try {
  const body = await req.json();
  const parsed: z.infer<typeof registerSchema> = registerSchema.parse(body);
  const {
    name,
    email,
    username,
    password,
    practiceId,
    phone,
    address,
    city,
    state,
    zipCode,
    country,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
  } = parsed;

    // Normalize practiceId to a number (DB uses integer foreign keys)
  const practiceIdInt: number = typeof practiceId === 'string' ? parseInt(practiceId, 10) : (practiceId as number);
    if (!Number.isFinite(practiceIdInt)) {
      return NextResponse.json({ error: 'Invalid practiceId. Must be a valid number.' }, { status: 400 });
    }

    // Check if a user with this email already exists
    const existingUser = await tenantDb.query.users.findFirst({
      where: eq(users.email, email as string),
    });

    if (existingUser) {
      console.warn(`[API Register] Registration attempt for existing email: ${email}`);
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Check if the provided practiceId exists
    const practice = await tenantDb.query.practices.findFirst({
  where: eq(practices.id, practiceIdInt),
    });

    if (!practice) {
      console.warn(`[API Register] Registration attempt with non-existent practiceId: ${practiceId}`);
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // Hash the password
  const hashedPassword: string = await bcrypt.hash(password as string, 12);
    console.log(`[API Register] Password hashed for email: ${email}`);

    // Create the new client user, include optional profile fields so address/contact
    // information provided on the client form is persisted.
    const insertData: typeof users.$inferInsert = {
      name: name as string,
      email: email as string,
      username: username as string,
      password: hashedPassword,
      role: 'CLIENT',
      practiceId: practiceIdInt as number,
      // Optional fields (may be undefined)
      phone: phone as string | undefined,
      address: address as string | undefined,
      city: city as string | undefined,
      state: state as string | undefined,
      zipCode: zipCode as string | undefined,
      country: country as string | undefined,
      emergencyContactName: emergencyContactName as string | undefined,
      emergencyContactPhone: emergencyContactPhone as string | undefined,
      emergencyContactRelationship: emergencyContactRelationship as string | undefined,
    };

    const [newUser] = await tenantDb.insert(users).values(insertData).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      role: users.role,
      practiceId: users.practiceId,
      // Return optional fields so the client can immediately populate UI
      phone: users.phone,
      address: users.address,
      city: users.city,
      state: users.state,
      zipCode: users.zipCode,
      country: users.country,
      emergencyContactName: users.emergencyContactName,
      emergencyContactPhone: users.emergencyContactPhone,
      emergencyContactRelationship: users.emergencyContactRelationship,
    });

    if (!newUser) {
      throw new Error("Failed to create new client user.");
    }
    console.log(`[API Register] Created new client: ${newUser.name} (${newUser.id}) for practice ${practice.id}`);

    console.log('[API Register SUCCESS] Registration successful.');
  // Return the created user directly for simpler client handling
  return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error('[API Register CATCH_ERROR] Error during registration:', error);
    return NextResponse.json({ error: 'Failed to register user due to an unexpected server error.' }, { status: 500 });
  }
}