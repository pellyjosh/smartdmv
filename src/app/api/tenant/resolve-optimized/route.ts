import { NextRequest, NextResponse } from "next/server";
import { getCompanyBySubdomain } from "@/tenant/db-manager";

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

    // Extract subdomain from identifier if it's a full domain
    let tenantIdentifier = identifier;
    if (identifier.includes('.')) {
      tenantIdentifier = identifier.split('.')[0];
    }

    // Check cache first
    const cached = getCachedTenant(tenantIdentifier);
    if (cached) {
      console.log(`[TENANT_RESOLVE] Cache hit for: ${tenantIdentifier}`);
      return NextResponse.json({ tenant: cached });
    }

    console.log(`[TENANT_RESOLVE] Cache miss, resolving tenant: ${tenantIdentifier}`);

    // Use the optimized tenant manager
    const company = await getCompanyBySubdomain(tenantIdentifier);

    if (!company) {
      console.log(`[TENANT_RESOLVE] Tenant not found: ${tenantIdentifier}`);
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Check if tenant is active
    if (!company.isActive) {
      console.log(`[TENANT_RESOLVE] Tenant not active: ${tenantIdentifier}`);
      return NextResponse.json(
        { error: "Tenant is not active" },
        { status: 403 }
      );
    }

    console.log(`[TENANT_RESOLVE] Tenant resolved successfully: ${company.name}`);

    // Transform the database record to match the TenantInfo interface
    const tenantInfo = {
      id: company.id.toString(),
      slug: company.subdomain,
      name: company.name,
      domain: company.subdomain + '.localhost:9002', // For development
      subdomain: company.subdomain,
      status: "active" as const,
      databaseName: company.subdomain + '_db',
      storagePath: `/storage/tenants/${company.subdomain}`,
      settings: {
        timezone: 'UTC',
        theme: 'default',
        features: [],
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
