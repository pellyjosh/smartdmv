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
    if (existing.status !== 'pending') return NextResponse.json({ error: 'Only pending refunds can be canceled' }, { status: 400 });
    const now = new Date();
    const [updated] = await tenantDb
      .update(refunds)
      .set({ status: 'void', updatedAt: now })
      .where(eq(refunds.id, id))
      .returning();

    const serializedUpdated = {
      ...updated,
      issuedAt: updated.issuedAt instanceof Date ? updated.issuedAt.toISOString() :
                updated.issuedAt ? new Date(updated.issuedAt).toISOString() : null,
      processedAt: updated.processedAt instanceof Date ? updated.processedAt.toISOString() :
                   updated.processedAt ? new Date(updated.processedAt).toISOString() : null,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() :
                 updated.createdAt ? new Date(updated.createdAt).toISOString() : null,
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() :
                 updated.updatedAt ? new Date(updated.updatedAt).toISOString() : null,
    };

    // Create audit log entry for cancellation
    try {
      await createAuditLogFromRequest(req as unknown as Request, {
        action: 'UPDATE',
        recordType: 'BILLING',
        recordId: String(id),
        description: `Refund ${id} canceled`,
        practiceId: String(practiceId),
        changes: { after: serializedUpdated }
      });
    } catch (auditErr) {
      console.error('Failed to create audit log for refund cancel:', auditErr);
    }

    return NextResponse.json(serializedUpdated);
  } catch (e) {
    console.error('Error canceling refund', e);
    return NextResponse.json({ error: 'Failed to cancel refund' }, { status: 500 });
  }
}
