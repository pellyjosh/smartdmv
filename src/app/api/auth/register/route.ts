// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, sessions, practices } from '@/db/schema'; // Assuming 'practices' schema exists
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';

// Zod schema for registration input validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  practiceId: z.string().min(1, "Practice ID is required."),
});

const updateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  email: z.string().email("Invalid email address.").optional(),
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters." })
    .optional()
    .transform(e => e === "" ? undefined : e),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  practiceId: z.string().min(1, "Practice ID is required.").optional(),
  role: z.enum(['ADMIN', 'VETERINARIAN', 'STAFF', 'CLIENT']).optional(),
});

interface Params {
  params: {
    userId: string;
  };
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = params.userId;
  console.log(`[API User PATCH START] Received request to update user: ${userId}`);

  if (!userId) {
    console.error('[API User PATCH] Missing userId in path parameters.');
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API User PATCH] Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if the user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      console.warn(`[API User PATCH] Update attempt for non-existent user: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare data for update
    const dataToUpdate: Partial<typeof users.$inferInsert> = {};

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.email !== undefined) {
      // If email is being updated, check for uniqueness
      if (updateData.email !== existingUser.email) {
        const emailExists = await db.query.users.findFirst({
          where: eq(users.email, updateData.email),
        });
        if (emailExists && emailExists.id !== userId) {
          console.warn(`[API User PATCH] Email already in use: ${updateData.email}`);
          return NextResponse.json({ error: 'Email already in use by another user' }, { status: 409 });
        }
      }
      dataToUpdate.email = updateData.email;
    }
    if (updateData.password !== undefined) {
      // Only hash and update password if it's explicitly provided and not an empty string
      if (updateData.password !== "") { // Double check for empty string after transform
        dataToUpdate.password = await bcrypt.hash(updateData.password, 12);
        console.log(`[API User PATCH] Password hashed for user: ${userId}`);
      }
    }
    if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone;
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address;
    if (updateData.city !== undefined) dataToUpdate.city = updateData.city;
    if (updateData.state !== undefined) dataToUpdate.state = updateData.state;
    if (updateData.zipCode !== undefined) dataToUpdate.zipCode = updateData.zipCode;
    if (updateData.country !== undefined) dataToUpdate.country = updateData.country;
    if (updateData.emergencyContactName !== undefined) dataToUpdate.emergencyContactName = updateData.emergencyContactName;
    if (updateData.emergencyContactPhone !== undefined) dataToUpdate.emergencyContactPhone = updateData.emergencyContactPhone;
    if (updateData.emergencyContactRelationship !== undefined) dataToUpdate.emergencyContactRelationship = updateData.emergencyContactRelationship;
    if (updateData.practiceId !== undefined) {
        // Optional: Add validation here to check if the new practiceId exists
        // const practice = await db.query.practices.findFirst({
        //   where: eq(practices.id, updateData.practiceId),
        // });
        // if (!practice) {
        //   return NextResponse.json({ error: 'New practice not found' }, { status: 404 });
        // }
        dataToUpdate.practiceId = updateData.practiceId;
    }
    if (updateData.role !== undefined) dataToUpdate.role = updateData.role;


    // Perform the update
    const [updatedUser] = await db.update(users)
      .set(dataToUpdate)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        practiceId: users.practiceId,
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

    if (!updatedUser) {
      throw new Error("Failed to update user. No rows affected.");
    }

    console.log(`[API User PATCH SUCCESS] User ${userId} updated successfully.`);
    return NextResponse.json({ user: updatedUser, message: 'User updated successfully' }, { status: 200 });

  } catch (error) {
    console.error(`[API User PATCH CATCH_ERROR] Error updating user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to update user due to an unexpected server error.' }, { status: 500 });
  }
}

// Optional: Add a GET function to fetch a single user by ID
export async function GET(req: Request, { params }: Params) {
  const userId = params.userId;
  console.log(`[API User GET START] Received request to fetch user: ${userId}`);

  if (!userId) {
    console.error('[API User GET] Missing userId in path parameters.');
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        practiceId: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelationship: true,
        // Do NOT return password hash
      }
    });

    if (!user) {
      console.warn(`[API User GET] User not found: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[API User GET SUCCESS] User ${userId} fetched successfully.`);
    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    console.error(`[API User GET CATCH_ERROR] Error fetching user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch user due to an unexpected server error.' }, { status: 500 });
  }
}

// Optional: Add a DELETE function to delete a single user by ID
export async function DELETE(req: Request, { params }: Params) {
    const userId = params.userId;
    console.log(`[API User DELETE START] Received request to delete user: ${userId}`);

    if (!userId) {
        console.error('[API User DELETE] Missing userId in path parameters.');
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const [deletedUser] = await db.delete(users)
            .where(eq(users.id, userId))
            .returning({ id: users.id });

        if (!deletedUser) {
            console.warn(`[API User DELETE] Delete attempt for non-existent user: ${userId}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log(`[API User DELETE SUCCESS] User ${userId} deleted successfully.`);
        return NextResponse.json({ message: 'User deleted successfully', id: deletedUser.id }, { status: 200 });

    } catch (error) {
        console.error(`[API User DELETE CATCH_ERROR] Error deleting user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to delete user due to an unexpected server error.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
  console.log('[API Register START] Received request to /api/auth/register');
  try {
    const body = await req.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API Register] Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, practiceId } = validationResult.data;

    // Check if a user with this email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      console.warn(`[API Register] Registration attempt for existing email: ${email}`);
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Check if the provided practiceId exists
    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, practiceId),
    });

    if (!practice) {
      console.warn(`[API Register] Registration attempt with non-existent practiceId: ${practiceId}`);
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log(`[API Register] Password hashed for email: ${email}`);

    // Create the new client user
    const [newUser] = await db.insert(users).values({
      id: `user_${crypto.randomUUID()}`,
      name,
      email,
      password: hashedPassword,
      role: 'CLIENT', // Create user as a CLIENT
      practiceId: practiceId, // Associate with the existing practice
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      practiceId: users.practiceId,
    });

    if (!newUser) {
      throw new Error("Failed to create new client user.");
    }
    console.log(`[API Register] Created new client: ${newUser.name} (${newUser.id}) for practice ${practice.id}`);

    console.log('[API Register SUCCESS] Registration successful.');
    // Return a success response without creating a session or setting a cookie
    return NextResponse.json({ user: newUser, message: 'Client created successfully' }, { status: 201 });

  } catch (error) {
    console.error('[API Register CATCH_ERROR] Error during registration:', error);
    return NextResponse.json({ error: 'Failed to register user due to an unexpected server error.' }, { status: 500 });
  }
}