import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { addons } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Add-on slug is required' },
        { status: 400 }
      );
    }

    // Fetch the add-on by slug
    const addon = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, slug))
      .limit(1);

    if (!addon || addon.length === 0) {
      return NextResponse.json(
        { error: 'Add-on not found' },
        { status: 404 }
      );
    }

    // Parse features JSON if it's a string
    const addonData = {
      ...addon[0],
      features: typeof addon[0].features === 'string' 
        ? JSON.parse(addon[0].features) 
        : addon[0].features
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
