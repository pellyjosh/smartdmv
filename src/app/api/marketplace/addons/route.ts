import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { addons } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const userRole = Array.isArray(user.role) ? user.role[0] : user.role;
    const allowedRoles = ['ADMINISTRATOR', 'PRACTICE_ADMIN', 'PRACTICE_ADMINISTRATOR', 'CLIENT', 'SUPER_ADMIN'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized. Admin or client access required.' }, { status: 401 });
    }

    console.log('Fetching marketplace addons');

    // Fetch all available addons
    const addonsData = await tenantDb.query.addons.findMany({
      orderBy: (addons, { asc, desc }) => [desc(addons.isPopular), asc(addons.name)]
    });

    console.log(`Found ${addonsData.length} addons:`, addonsData.map(a => ({ id: a.id, name: a.name, category: a.category })));

    // Transform the data to parse JSON fields for SQLite
    const transformedAddons = addonsData.map(addon => ({
      ...addon,
      features: typeof addon.features === 'string' ? JSON.parse(addon.features || '[]') : addon.features || [],
      pricingTiers: typeof addon.pricingTiers === 'string' ? JSON.parse(addon.pricingTiers || '{}') : addon.pricingTiers || {},
      galleryImages: typeof addon.galleryImages === 'string' ? JSON.parse(addon.galleryImages || '[]') : addon.galleryImages || [],
    }));

    return NextResponse.json(transformedAddons, { status: 200 });
  } catch (error) {
    console.error('Error fetching marketplace addons:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch addons due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
