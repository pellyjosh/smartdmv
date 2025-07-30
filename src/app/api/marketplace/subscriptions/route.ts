import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { practiceAddons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
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
