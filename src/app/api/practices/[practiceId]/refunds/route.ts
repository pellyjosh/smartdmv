import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { refunds } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { desc, eq } from 'drizzle-orm';

// Drizzle inferred row type
type RefundRow = typeof refunds.$inferSelect;

// GET: list refunds for a practice
// POST: create new refund (initially pending)
export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const { practiceId: practiceIdParam } = await context.params;
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(practiceIdParam);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const tenantDb = await getCurrentTenantDb();
    const rows = await tenantDb.select({
      id: refunds.id,
      practiceId: refunds.practiceId,
      amount: refunds.amount,
      currency: refunds.currency,
      reason: refunds.reason,
      status: refunds.status,
      issuedAt: refunds.issuedAt,
      processedAt: refunds.processedAt,
      externalReference: refunds.externalReference,
      notes: refunds.notes,
      issuedById: refunds.issuedById,
      clientId: refunds.clientId,
      clientName: users.name,
    })
    .from(refunds)
    .leftJoin(users, eq(refunds.clientId, users.id))
    .where(eq(refunds.practiceId, practiceId))
    .orderBy(desc(refunds.createdAt));
    // Helper function to safely serialize any value that might have toISOString issues
    const safeSerialize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;

      if (obj instanceof Date) return obj.toISOString();

      if (Array.isArray(obj)) {
        return obj.map(item => safeSerialize(item));
      }

      if (typeof obj === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key.endsWith('At') || key === 'issuedAt' || key === 'processedAt' || key === 'createdAt' || key === 'updatedAt') {
            if (value instanceof Date) {
              serialized[key] = value.toISOString();
            } else if (value && (typeof value === 'string' || typeof value === 'number')) {
              try {
                serialized[key] = new Date(value).toISOString();
              } catch {
                serialized[key] = null;
              }
            } else {
              serialized[key] = null;
            }
          } else {
            serialized[key] = safeSerialize(value);
          }
        }
        return serialized;
      }

      return obj;
    };

    // Map to frontend shape similar to sample provided
    const mapped = rows.map((r: RefundRow) => {
      const rawStatus = Array.isArray(r.status) ? r.status[0] : r.status;

    return {
      id: r.id,
      // Prefer any stored external/payment identifier. Some legacy rows may have
      // different field names depending on how they were inserted; try multiple
      // possibilities before falling back to a generated PAY-<id> value.
      paymentId:
        (r as any).externalReference || (r as any).paymentId || `PAY-${r.id}`,
        amount: r.amount,
        currency: r.currency,
        currencyId: (r as any).currencyId || null,
        gatewayType: 'STRIPE', // placeholder until gateway integration
        status: String(rawStatus).toUpperCase(),
        requestedAt: r.issuedAt instanceof Date ? r.issuedAt.toISOString() :
                     r.issuedAt ? new Date(r.issuedAt).toISOString() : null,
        processedAt: r.processedAt instanceof Date ? r.processedAt.toISOString() :
                     r.processedAt ? new Date(r.processedAt).toISOString() : null,
        completedAt: rawStatus === 'processed' ?
          (r.processedAt instanceof Date ? r.processedAt.toISOString() :
           r.processedAt ? new Date(r.processedAt).toISOString() : null) : null,
        reason: r.reason,
        notes: r.notes,
        clientId: (r as any).clientId,
        clientName: (r as any).clientName || 'Unknown',
        errorDetails: rawStatus === 'failed' ? r.notes : null,
      };
    });

    // Apply safe serialization to the entire response
    const serializedResponse = safeSerialize(mapped);
    return NextResponse.json(serializedResponse);
  } catch (e) {
    console.error('Error listing refunds', e);
    return NextResponse.json({ error: 'Failed to list refunds' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const { practiceId: practiceIdParam } = await context.params;
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(practiceIdParam);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const body = await req.json();
    const { paymentId, amount, currency = 'USD', gatewayType, clientId, reason, notes } = body;
    if (!paymentId || !amount || !gatewayType || !clientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const tenantDb = await getCurrentTenantDb();
    // (Optional) Validate client exists in this practice
    // const clientExists = await tenantDb.select({ id: users.id }).from(users).where(and(eq(users.id, Number(clientId)), eq(users.practiceId, practiceId)));
  // Determine practice default currency
  const practice = await tenantDb.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, practiceId) });
  const defaultCurrencyId = (practice as any)?.defaultCurrencyId;
  if (!defaultCurrencyId) return NextResponse.json({ error: 'Practice has no configured default currency' }, { status: 400 });

    const [created] = await tenantDb.insert(refunds).values({
      practiceId,
      amount: amount.toString(),
      currency: undefined, // use FK currencyId as single source
      currencyId: defaultCurrencyId,
      clientId: clientId ? Number(clientId) : null,
      reason: reason || 'Refund requested',
      notes: notes || null,
      externalReference: paymentId,
      status: 'pending'
    }).returning();

    // Apply safe serialization to handle timestamp fields
    const serializedCreated = {
      ...created,
      issuedAt: created.issuedAt instanceof Date ? created.issuedAt.toISOString() :
                created.issuedAt ? new Date(created.issuedAt).toISOString() : null,
      processedAt: created.processedAt instanceof Date ? created.processedAt.toISOString() :
                   created.processedAt ? new Date(created.processedAt).toISOString() : null,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() :
                 created.createdAt ? new Date(created.createdAt).toISOString() : null,
      updatedAt: created.updatedAt instanceof Date ? created.updatedAt.toISOString() :
                 created.updatedAt ? new Date(created.updatedAt).toISOString() : null,
    };

    return NextResponse.json(serializedCreated, { status: 201 });
  } catch (e) {
    console.error('Error creating refund', e);
    return NextResponse.json({ error: 'Failed to create refund' }, { status: 500 });
  }
}
