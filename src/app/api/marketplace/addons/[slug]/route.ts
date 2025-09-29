import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { addons } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Add-on slug is required' },
        { status: 400 }
      );
    }

    // Fetch the add-on by slug
    const addon = await tenantDb.query.addons.findFirst({
      where: eq(addons.slug, slug)
    });

    if (!addon) {
      return NextResponse.json(
        { error: 'Add-on not found' },
        { status: 404 }
      );
    }

    // Parse features JSON if it's a string
    const addonData = {
      ...addon,
      features: typeof addon.features === 'string' ? JSON.parse(addon.features || '[]') : addon.features || [],
      pricingTiers: typeof addon.pricingTiers === 'string' ? JSON.parse(addon.pricingTiers || '{}') : addon.pricingTiers || {},
      galleryImages: typeof addon.galleryImages === 'string' ? JSON.parse(addon.galleryImages || '[]') : addon.galleryImages || [],
    };

    return NextResponse.json(addonData, { status: 200 });
  } catch (error) {
    console.error('Error fetching add-on by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch add-on' },
      { status: 500 }
    );
  }
}
