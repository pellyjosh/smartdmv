/**
 * Get current tenant information including database ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/tenant-context';

export async function GET(req: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantContext.tenantId,
        subdomain: tenantContext.subdomain,
        dbName: tenantContext.dbName,
      }
    });
  } catch (error) {
    console.error('[TenantAPI] Failed to get tenant context:', error);
    return NextResponse.json(
      { error: 'Failed to get tenant context' },
      { status: 500 }
    );
  }
}
