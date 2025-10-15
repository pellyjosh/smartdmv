import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { refunds } from '@/db/schemas/financeSchema';
import { createAuditLogFromRequest } from '@/lib/audit-logger';
import { and, eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ practiceId: string; refundId: string }> }) {
  try {
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId: practiceIdParam, refundId } = await params;
    const practiceId = parseInt(practiceIdParam);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const id = parseInt(refundId);
    const tenantDb = await getCurrentTenantDb();
    const [existing] = await tenantDb.select().from(refunds).where(and(eq(refunds.id, id), eq(refunds.practiceId, practiceId)));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status !== 'pending') return NextResponse.json({ error: 'Only pending refunds can be processed' }, { status: 400 });
    const now = new Date();
    const [updated] = await tenantDb
      .update(refunds)
      .set({ status: 'processed', processedAt: now, updatedAt: now })
      .where(eq(refunds.id, id))
      .returning();

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

    const serializedResponse = safeSerialize(updated);

    // Audit log for processing
    try {
      await createAuditLogFromRequest(req as unknown as Request, {
        action: 'UPDATE',
        recordType: 'BILLING',
        recordId: String(id),
        description: `Refund ${id} processed`,
        practiceId: String(practiceId),
        changes: { after: serializedResponse }
      });
    } catch (auditErr) {
      console.error('Failed to create audit log for refund process:', auditErr);
    }

    return NextResponse.json(serializedResponse);
  } catch (e) {
    console.error('Error processing refund', e);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}
