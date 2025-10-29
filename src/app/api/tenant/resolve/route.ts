import { NextRequest, NextResponse } from "next/server";
import { ownerDb } from "@/db/owner-db";
import { tenants } from "@/owner/db/schemas/ownerSchema";
import { eq, or } from "drizzle-orm";

// In-memory cache for tenant lookups
const tenantCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting for tenant lookups
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // Max 20 requests per minute per IP

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(clientIp);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    requestCounts.set(clientIp, { count: 1, timestamp: now });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  entry.count++;
  return false;
}

function getCachedTenant(identifier: string) {
  const cached = tenantCache.get(identifier);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    tenantCache.delete(identifier);
    return null;
  }
  
  return cached.data;
}

function setCachedTenant(identifier: string, data: any) {
  tenantCache.set(identifier, {
    data,
    timestamp: Date.now()
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { identifier, type } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier is required" },
        { status: 400 }
      );
    }

    console.log(`[TENANT_RESOLVE] Resolving tenant for identifier: ${identifier}, type: ${type}`);

    // Extract subdomain from identifier if it's a full domain
    let tenantIdentifier = identifier;
    if (identifier.includes('.')) {
      // Extract subdomain from something like "smartvet.localhost"
      tenantIdentifier = identifier.split('.')[0];
    }

    // Check cache first
    const cached = getCachedTenant(tenantIdentifier);
    if (cached) {
      console.log(`[TENANT_RESOLVE] Cache hit for: ${tenantIdentifier}`);
      return NextResponse.json({ 
        tenant: cached,
        cached: true // Indicate this was from cache
      });
    }

    console.log(`[TENANT_RESOLVE] Cache miss, looking for tenant with identifier: ${tenantIdentifier}`);

    // Query the owner database to find the tenant
    const [tenant] = await ownerDb
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
        customDomain: tenants.customDomain,
        status: tenants.status,
        plan: tenants.plan,
        settings: tenants.settings,
        dbName: tenants.dbName,
        storagePath: tenants.storagePath,
      })
      .from(tenants)
      .where(
        or(
          eq(tenants.subdomain, tenantIdentifier),
          eq(tenants.customDomain, identifier)
        )
      )
      .limit(1);

    if (!tenant) {
      console.log(`[TENANT_RESOLVE] Tenant not found for identifier: ${tenantIdentifier}`);
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Check if tenant is active
    if (tenant.status !== 'ACTIVE') {
      console.log(`[TENANT_RESOLVE] Tenant not active: ${tenantIdentifier} (status: ${tenant.status})`);
      return NextResponse.json(
        { error: "Tenant is not active" },
        { status: 403 }
      );
    }

    console.log(`[TENANT_RESOLVE] Tenant resolved successfully: ${tenant.name}`);

    // Transform the database record to match the TenantInfo interface
    const tenantInfo = {
      id: tenant.id.toString(),
      slug: tenant.subdomain,
      name: tenant.name,
      domain: tenant.customDomain,
      subdomain: tenant.subdomain,
      status: tenant.status.toLowerCase() as "active" | "inactive" | "suspended",
      databaseName: tenant.dbName,
      storagePath: tenant.storagePath,
      settings: {
        timezone: 'UTC', // Can be added to schema later
        theme: 'default', // Can be added to schema later
        features: tenant.settings?.features || [],
      },
    };

    // Cache the result
    setCachedTenant(tenantIdentifier, tenantInfo);

    return NextResponse.json({ 
      tenant: tenantInfo,
      cached: false // Indicate this was a fresh fetch
    });
  } catch (error) {
    console.error("Error resolving tenant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add a cache cleanup function that runs periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tenantCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      tenantCache.delete(key);
    }
  }
  
  // Clean up rate limiting data
  for (const [key, entry] of requestCounts.entries()) {
    if (now - entry.timestamp > RATE_LIMIT_WINDOW) {
      requestCounts.delete(key);
    }
  }
}, 60 * 1000); // Run every minute
