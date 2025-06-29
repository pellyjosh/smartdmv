// src/app/api/auth/clients/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, UserRoleEnum } from '@/db/schema'; // Assuming UserRoleEnum is exported from your schema
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Zod schema for GET request query parameters
const getClientsSchema = z.object({
  practiceId: z.string().nonempty("Practice ID is required."),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const queryParams = Object.fromEntries(searchParams);
    const validationResult = getClientsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.error('[API Clients GET] Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { practiceId } = validationResult.data;

    // Fetch users with role 'CLIENT' for the given practiceId
    const clients = await db.query.users.findMany({
      where: and(
        eq(users.role, UserRoleEnum.CLIENT),
        eq(users.practiceId, practiceId)
      ),
      // Select all fields that are relevant for the frontend client list
      // Exclude sensitive fields like password
      columns: {
        id: true,
        email: true,
        name: true,
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
        username: true, // Include username as it's in your clientFormSchema
      },
    });

    console.log(`[API Clients GET] Found ${clients.length} clients for practiceId: ${practiceId}`);
    return NextResponse.json(clients, { status: 200 });

  } catch (error) {
    console.error('[API Clients GET CATCH_ERROR] Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients', details: (error as Error).message },
      { status: 500 }
    );
  }
}