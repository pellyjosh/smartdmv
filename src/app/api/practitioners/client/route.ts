import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching practitioners for client practice:', user.practiceId);

    // Fetch practitioners (veterinarians) from the same practice
    const practitionersData = await db.query.users.findMany({
      where: and(
        eq(users.practiceId, Number(user.practiceId)),
        eq(users.role, 'VETERINARIAN')
      ),
      columns: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)]
    });

    console.log(`Found ${practitionersData.length} practitioners`);

    return NextResponse.json(practitionersData, { status: 200 });
  } catch (error) {
    console.error('Error fetching practitioners:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch practitioners due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
