// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { pgPool } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// GET a specific user by ID
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop(); // Extract user ID from the URL path
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  console.log('Pathname:', pathname);
  console.log('Extracted User ID:', userId);

  try {
    if (Number.isFinite(userId)) {
      const userData = await tenantDb.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userData.length === 0) {
        console.log('User not found for ID:', idStr);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(userData[0], { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PATCH: Update a user by ID
export async function PATCH(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop();
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
  const body = await request.json();
  // Debug: log incoming body to help identify malformed date-like values
  console.log('[PATCH /api/users] incoming body:', JSON.stringify(body, null, 2));
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      username: z.string().min(3).optional(),
      // password updates not supported here
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zipCode: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      emergencyContactName: z.string().optional().nullable(),
      emergencyContactPhone: z.string().optional().nullable(),
      emergencyContactRelationship: z.string().optional().nullable(),
      role: z.string().optional(),
      practiceId: z.union([z.string(), z.number()]).optional(),
    });

  const parsed = updateSchema.parse(body);
  console.log('[PATCH /api/users] parsed data types:', Object.fromEntries(Object.keys(parsed).map(k => [k, typeof (parsed as any)[k]])));

    // Normalize practiceId -> number if provided
  const updateData: Record<string, any> = { ...parsed };
  console.log('[PATCH /api/users] updateData pre-normalize:', updateData);
    if (parsed.practiceId !== undefined) {
      const practiceIdInt = typeof parsed.practiceId === 'string' ? parseInt(parsed.practiceId, 10) : parsed.practiceId;
      if (!Number.isFinite(practiceIdInt as number)) {
        return NextResponse.json({ error: 'Invalid practiceId. Must be a valid number.' }, { status: 400 });
      }
      updateData.practiceId = practiceIdInt as number;
    }

    // Remove any date fields that might be passed in - let Drizzle handle updatedAt automatically
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.lastLogin;
    delete updateData.id; // Don't allow updating the ID

    // Also handle any Date objects that might have been passed
    Object.keys(updateData).forEach(key => {
      if (updateData[key] instanceof Date) {
        console.warn(`Removing Date object field: ${key}`);
        delete updateData[key];
      }
    });

    // Sanitize updateData recursively to avoid objects that have a non-function `toISOString` property
    const sanitizeForUpdate = (input: any): any => {
      if (input === undefined || input === null) return input;
      if (input instanceof Date) return input;
      const t = typeof input;
      if (t === 'string' || t === 'number' || t === 'boolean') return input;
      if (Array.isArray(input)) return input.map(sanitizeForUpdate);
      if (t === 'object') {
        // If object has a toISOString property that isn't a function, remove it to avoid accidental calls
        if ('toISOString' in input && typeof (input as any).toISOString !== 'function') {
          try { delete (input as any).toISOString; } catch {}
        }
        const out: any = {};
        for (const k of Object.keys(input)) {
          out[k] = sanitizeForUpdate((input as any)[k]);
        }
        return out;
      }
      return input;
    };

  const safeUpdateData = sanitizeForUpdate(updateData);
    console.log('[PATCH /api/users] safeUpdateData to be written:', JSON.stringify(safeUpdateData, null, 2));

    // Per-field diagnostics to catch weird fields that may cause toISOString calls in nested code
    for (const k of Object.keys(safeUpdateData)) {
      const v = (safeUpdateData as any)[k];
      try {
        console.log(`[PATCH /api/users] field ${k}: typeof=${typeof v}${v === null ? ' (null)' : ''}${Array.isArray(v) ? ' (array)' : ''}` +
          `${v && typeof (v as any).toISOString !== 'undefined' ? `, has toISOString=${typeof (v as any).toISOString}` : ''}`);
      } catch (e) {
        console.log(`[PATCH /api/users] field ${k}: error reading type:`, e);
      }
    }

    // Some DB drivers or ORMs may attempt to serialize fields (e.g. call toISOString)
    // when using `.returning()` which can crash if a value has a non-function
    // toISOString property. Try the normal returning() first, but fall back to
    // an update-then-select strategy if it throws.
    let updated: any = null;

    // Pre-check: fetch the current DB row raw to inspect values prior to update.
    try {
      const preRes = await pgPool.query('SELECT * FROM "users" WHERE id = $1 LIMIT 1', [userId]);
      if (preRes && preRes.rows && preRes.rows.length) {
        const preInspect = preRes.rows.map(r => {
          const obj: Record<string, any> = {};
          for (const kk of Object.keys(r)) {
            const val = (r as any)[kk];
            obj[kk] = val === null || val === undefined ? null : typeof val === 'object' ? '[object]' : String(val);
          }
          return obj;
        });
        console.log('[PATCH /api/users] pre-update raw row (text-safe):', preInspect);
      } else {
        console.log('[PATCH /api/users] pre-update: no existing row found for id', userId);
      }
    } catch (preErr) {
      console.error('[PATCH /api/users] pre-update raw SELECT failed:', preErr);
    }

    // Helper to safely inspect a row without triggering toISOString on values
    const inspectRow = (r: any) => {
      try {
        const info: Record<string, any> = {};
        if (!r || typeof r !== 'object') return String(r);
        for (const key of Object.keys(r)) {
          try {
            const v = (r as any)[key];
            info[key] = {
              type: Array.isArray(v) ? 'array' : typeof v,
              isNull: v === null,
              hasToISOString: v && typeof (v as any).toISOString !== 'undefined',
              toISOStringType: v && typeof (v as any).toISOString,
            };
          } catch (inner) {
            info[key] = { error: String(inner) };
          }
        }
        return info;
      } catch (e) {
        return { error: String(e) };
      }
    };
    try {
      const [row] = await db
        .update(users)
        .set(safeUpdateData)
        .where(eq(users.id, userId))
        .returning();
      console.log('[PATCH /api/users] db returned updated row (via returning):', inspectRow(row));
      updated = row;
    } catch (e) {
      // Log the error and attempt a safer fallback
      console.error('[PATCH /api/users] .returning() failed, falling back to update+select. Error:', e);
      try {
          // Use raw SQL via pgPool to avoid Drizzle internals entirely
          // Build parameterized SET clause and values
          const keys = Object.keys(safeUpdateData);
          const setClauses: string[] = [];
          const values: any[] = [];
          keys.forEach((k, i) => {
            // map camelCase keys back to snake_case DB columns if needed
            const dbKey = k.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`"${dbKey}" = $${i + 1}`);
            values.push((safeUpdateData as any)[k]);
          });
          // Append userId param
          values.push(userId);

          const updateSql = `UPDATE "users" SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`;
          try {
            const rawRes = await pgPool.query(updateSql, values);
            console.log('[PATCH /api/users] raw update returned rows:', rawRes.rows.length);
            if (rawRes.rows.length > 0) {
              console.log('[PATCH /api/users] raw row sample keys:', Object.keys(rawRes.rows[0]));
              // Log raw values as text-safe to avoid Date-toISOString issues
              const rawInspect = rawRes.rows.map(r => {
                const obj: Record<string, any> = {};
                for (const kk of Object.keys(r)) {
                  const val = (r as any)[kk];
                  obj[kk] = val === null || val === undefined ? null : typeof val === 'object' ? '[object]' : String(val);
                }
                return obj;
              });
              console.log('[PATCH /api/users] raw rows (text-safe):', rawInspect);
              updated = rawRes.rows[0];
            }
          } catch (rawErr) {
            console.error('[PATCH /api/users] raw SQL fallback failed:', rawErr);
            throw rawErr;
          }
      } catch (e2) {
        console.error('[PATCH /api/users] fallback update+select failed:', e2);
        throw e2; // let outer catch handle the response
      }
    }

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Ensure any date-like fields on the returned row are serialized safely
    const safeToISOString = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString();
      if (typeof value === 'object' && typeof (value as any).toISOString === 'function') {
        try { return (value as any).toISOString(); } catch { return null; }
      }
      try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch { return null; }
    };

    // Coerce and sanitize the returned DB row to remove any dangerous properties
    const safeRow: any = {};
    for (const k of Object.keys(updated)) {
      const v = (updated as any)[k];
      // If a value is an object with a non-function toISOString, remove that property
      if (v && typeof v === 'object' && 'toISOString' in v && typeof (v as any).toISOString !== 'function') {
        try { delete (v as any).toISOString; } catch {}
      }
      // For known date fields, coerce to ISO string safely
      if (['createdAt', 'updatedAt', 'lastLogin'].includes(k)) {
        safeRow[k] = safeToISOString(v);
        continue;
      }
      // Primitive or serializable values are passed through
      try {
        safeRow[k] = v;
      } catch (e) {
        safeRow[k] = String(v);
      }
    }

    return NextResponse.json(safeRow, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// PUT: Update a user by ID (alias for PATCH for compatibility)
export async function PUT(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  return PATCH(request);
}

// DELETE: Remove a user by ID
export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop();
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
