import { NextResponse, NextRequest } from "next/server";
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practiceAddons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();

    // Get the user's practice ID
    const practiceId = 'practiceId' in user ? user.practiceId : 
                       'currentPracticeId' in user ? user.currentPracticeId : null;

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID not found. Please ensure you are associated with a practice.' }, { status: 400 });
    }

    console.log('Fetching practice addons for practice:', practiceId);

    // Fetch practice addons (subscriptions)
    const practiceAddonsData = await tenantDb.query.practiceAddons.findMany({
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
    });

    console.log(`Found ${practiceAddonsData.length} practice addon subscriptions`);

    // Transform the data to parse JSON fields for SQLite
    const transformedData = practiceAddonsData.map((practiceAddon: any) => ({
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
