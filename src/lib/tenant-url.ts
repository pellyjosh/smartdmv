

const DEV = process.env.NODE_ENV !== 'production';
const DEV_PORT = process.env.NEXT_PUBLIC_DEV_PORT || '9002';
const OWNER_DOMAIN = (process.env.NEXT_PUBLIC_OWNER_DOMAIN || '').replace(/\/$/, '');
const EXPLICIT_TENANT_BASE = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || '').replace(/\/$/, '');

function deriveTenantBaseDomain(): string | undefined {
  if (EXPLICIT_TENANT_BASE) return EXPLICIT_TENANT_BASE;
  if (!OWNER_DOMAIN) return undefined;

  return OWNER_DOMAIN;
}

function defaultProtocol(): string {
  if (DEV) return 'http';
  if (process.env.NEXT_PUBLIC_FORCE_HTTP === 'true') return 'http';
  return 'https';
}

export interface BuildTenantUrlOptions {
  customDomain?: string | null;
  protocol?: string; // override protocol if needed
}

/**
 * Build a full absolute URL for a tenant given its subdomain and optional custom domain.
 *
 * Resolution order:
 *  1. If customDomain is provided & active -> protocol + customDomain
 *  2. If development -> http://<subdomain>.localhost:<port>
 *  3. Production -> <protocol>://<subdomain>.<tenantBaseDomain>
 */
export function buildTenantUrl(subdomain: string, opts: BuildTenantUrlOptions = {}): string {
  const safeSub = (subdomain || '').trim().toLowerCase();
  const protocol = opts.protocol || defaultProtocol();

  if (!safeSub) return '';

  if (opts.customDomain) {
    return `${protocol}://${opts.customDomain.replace(/^https?:\/\//, '')}`;
  }

  if (DEV) {
    // Local multi-tenant dev pattern: <subdomain>.localhost:<port>
    return `http://${safeSub}.localhost:${DEV_PORT}`;
  }

  const tenantBase = deriveTenantBaseDomain();
  if (!tenantBase) {
    // Fallback to owner domain if we cannot compute a base
    return `${protocol}://${safeSub}.${OWNER_DOMAIN}`;
  }
  return `${protocol}://${safeSub}.${tenantBase}`;
}

/**
 * Returns the owner (control plane) absolute URL.
 * Prefers NEXT_PUBLIC_APP_URL else constructs from OWNER_DOMAIN.
 */
export function getOwnerAppUrl(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, '') + '/';
  if (OWNER_DOMAIN) return `${defaultProtocol()}://${OWNER_DOMAIN}/`;
  return undefined;
}

/**
 * Build a tenant-relative path anchor (useful for linking from owner UI without hard-coding domains).
 * Example: getTenantLink('acme', '/login') -> full tenant URL + /login
 */
export function getTenantLink(subdomain: string, path: string, opts: BuildTenantUrlOptions = {}): string {
  const base = buildTenantUrl(subdomain, opts);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Extract tenant (subdomain) from a hostname on the client side, honoring custom domains.
 * NOTE: Real authoritative resolution still belongs on the server/middleware.
 */
export function extractTenantFromHost(host?: string): string | null {
  if (!host) return null;
  const h = host.toLowerCase();
  if (DEV) {
    // pattern: <tenant>.localhost:<port>
    const match = h.match(/^([^.]+)\.localhost(?::\d+)?$/);
    return match ? match[1] : null;
  }
  // If using owner domain as base, tenant appears as first label before it.
  if (OWNER_DOMAIN && h.endsWith(OWNER_DOMAIN)) {
    const withoutOwner = h.slice(0, h.length - OWNER_DOMAIN.length - 1); // remove .OWNER_DOMAIN
    if (!withoutOwner) return null; // owner itself
    return withoutOwner.split('.')[0];
  }
  // Custom domain scenario: cannot infer safely (needs server DB lookup)
  return null;
}

/**
 * Convenience for logging current environment URL config (can be invoked manually in debugging).
 */
export function debugUrlConfig() {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line no-console
  console.log('[URL_CONFIG]', {
    NODE_ENV: process.env.NODE_ENV,
    OWNER_DOMAIN,
    EXPLICIT_TENANT_BASE,
    derivedTenantBase: deriveTenantBaseDomain(),
    DEV_PORT,
  });
}
