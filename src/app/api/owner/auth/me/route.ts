import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ownerDb } from '@/db/owner-db.config';
import { ownerUsers, ownerSessions, tenants } from '@/db/owner-schema';
import { eq, and, gt, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  console.log('[API OWNER ME START] Received request to /api/owner/auth/me');
  
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('owner_session');
    
    if (!sessionCookie) {
      console.log('[API OWNER ME] No owner session cookie found. Returning null.');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Check if this is a JSON session (legacy) or session ID (new)
    let user = null;
    let shouldMigrate = false;

    try {
      // Try to parse as JSON first (legacy format)
      const sessionData = JSON.parse(sessionCookie.value);
      
      if (sessionData.email) {
        // Legacy JSON session - fetch user directly
        const users = await ownerDb
          .select({
            id: ownerUsers.id,
            email: ownerUsers.email,
            name: ownerUsers.name,
            username: ownerUsers.username,
            role: ownerUsers.role,
            phone: ownerUsers.phone,
            createdAt: ownerUsers.createdAt,
          })
          .from(ownerUsers)
          .where(eq(ownerUsers.email, sessionData.email))
          .limit(1);

        user = users[0];
        shouldMigrate = true;
      }
    } catch (parseError) {
      // Not JSON, try as session ID
      const [session] = await ownerDb
        .select({
          userId: ownerSessions.userId,
          expiresAt: ownerSessions.expiresAt,
          user: {
            id: ownerUsers.id,
            email: ownerUsers.email,
            username: ownerUsers.username,
            name: ownerUsers.name,
            phone: ownerUsers.phone,
            role: ownerUsers.role,
            createdAt: ownerUsers.createdAt,
          }
        })
        .from(ownerSessions)
        .innerJoin(ownerUsers, eq(ownerSessions.userId, ownerUsers.id))
        .where(
          and(
            eq(ownerSessions.id, sessionCookie.value),
            gt(ownerSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (session) {
        user = session.user;
      }
    }

    if (!user) {
      console.log('[API OWNER ME] No valid owner session found.');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Get dashboard statistics
    const [tenantStats] = await ownerDb
      .select({ count: count() })
      .from(tenants);

    const [activeTenantStats] = await ownerDb
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.status, 'ACTIVE'));

    const userData = {
      ...user,
      stats: {
        totalTenants: tenantStats.count,
        activeTenants: activeTenantStats.count,
        inactiveTenants: tenantStats.count - activeTenantStats.count,
      }
    };

    console.log('[API OWNER ME SUCCESS] Owner user found:', user.email);
    return NextResponse.json({ user: userData }, { status: 200 });

  } catch (error) {
    console.error('[API OWNER ME ERROR] Error validating owner session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
