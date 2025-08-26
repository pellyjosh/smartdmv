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

    // Get the practice ID based on user role
    let practiceId;
    if (userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN') {
      practiceId = user.currentPracticeId;
    } else {
      practiceId = user.practiceId;
    }

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID not found. Please ensure you are associated with a practice.' }, { status: 400 });
    }

    console.log('Fetching practice addons for practice:', practiceId);

    // Fetch practice addons (subscriptions)
    const practiceAddonsData = await db.query.practiceAddons.findMany({
      where: eq(practiceAddons.practiceId, parseInt(practiceId.toString())),
      with: {
        addon: {
          columns: {
            id: true,
            name: true,
            slug: true,
            description: true,
            shortDescription: true,
            category: true,
            icon: true,
            coverImage: true,
            features: true,
            pricingTiers: true,
            price: true,
          }
        }
      },
      orderBy: (practiceAddons, { desc }) => [desc(practiceAddons.lastActivatedAt)]
    });

    console.log(`Found ${practiceAddonsData.length} practice addon subscriptions`);

    // Transform the data to parse JSON fields for SQLite
    const transformedData = practiceAddonsData.map(practiceAddon => ({
      ...practiceAddon,
      addon: practiceAddon.addon ? {
        ...practiceAddon.addon,
        features: typeof practiceAddon.addon.features === 'string' ? 
          JSON.parse(practiceAddon.addon.features || '[]') : 
          practiceAddon.addon.features || [],
        pricingTiers: typeof practiceAddon.addon.pricingTiers === 'string' ? 
          JSON.parse(practiceAddon.addon.pricingTiers || '{}') : 
          practiceAddon.addon.pricingTiers || {},
      } : null
    }));

    return NextResponse.json(transformedData, { status: 200 });
  } catch (error) {
    console.error('Error fetching practice addons:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch practice addons due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
