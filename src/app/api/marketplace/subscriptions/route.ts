import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { practiceAddons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const userRole = Array.isArray(user.role) ? user.role[0] : user.role;
    const allowedRoles = ['ADMINISTRATOR', 'PRACTICE_ADMIN', 'PRACTICE_ADMINISTRATOR', 'CLIENT'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized. Admin or client access required.' }, { status: 401 });
    }

    if (!user.practiceId) {
      return NextResponse.json({ error: 'Practice ID not found. Please ensure you are associated with a practice.' }, { status: 400 });
    }

    console.log('Fetching subscriptions for practice:', user.practiceId);

    // Fetch practice subscriptions
    const subscriptionsData = await db.query.practiceAddons.findMany({
      where: eq(practiceAddons.practiceId, user.practiceId),
      with: {
        addon: {
          columns: {
            id: true,
            name: true,
            description: true,
            category: true,
            icon: true,
          }
        }
      },
      orderBy: (practiceAddons, { desc }) => [desc(practiceAddons.lastActivatedAt)]
    });

    console.log(`Found ${subscriptionsData.length} subscriptions`);

    return NextResponse.json(subscriptionsData, { status: 200 });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch subscriptions due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
