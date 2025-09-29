import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { integrationSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/integration-settings/verify-website - Verify website ownership
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ 
        verified: false, 
        message: 'Invalid URL format' 
      }, { status: 400 });
    }

    // For now, we'll implement a simple verification process
    // In a real implementation, you might:
    // 1. Check for a meta tag on the website
    // 2. Check for a verification file in the root directory
    // 3. Use DNS TXT records
    // 4. Send an email to the domain owner
    
    let verified = false;
    let message = '';

    try {
      // Basic check - try to fetch the website
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'SmartDVM-Verification-Bot/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        // For demo purposes, we'll consider any accessible website as "verified"
        // In production, you'd implement proper verification
        verified = true;
        message = 'Website is accessible and verified successfully';
        
        // Update the integration settings
        const existingSettings = await tenantDb.query.integrationSettings.findFirst({
          where: eq(integrationSettings.practiceId, parseInt(userPractice.practiceId))
        });

        if (existingSettings) {
          await db
            .update(integrationSettings)
            .set({
              websiteUrl: url,
              isVerified: verified,
              updatedAt: new Date()
            })
            .where(eq(integrationSettings.id, existingSettings.id));
        } else {
          await tenantDb.insert(integrationSettings).values({
            practiceId: parseInt(userPractice.practiceId),
            websiteUrl: url,
            isVerified: verified,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } else {
        verified = false;
        message = `Website returned status ${response.status}. Please ensure your website is accessible.`;
      }
    } catch (error) {
      verified = false;
      message = 'Unable to access the website. Please check the URL and try again.';
      console.error('Website verification error:', error);
    }

    return NextResponse.json({ 
      verified,
      message
    });
  } catch (error) {
    console.error('Error verifying website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
