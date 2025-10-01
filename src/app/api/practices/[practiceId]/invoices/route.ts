import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices, invoiceItems } from '@/db/schema';
import { and, eq, desc, count } from 'drizzle-orm';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { hasPermission } from '@/lib/rbac-helpers';

// GET /api/practices/[practiceId]/invoices - Admin/staff view of practice invoices
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdParam } = await params;
    const practiceId = parseInt(practiceIdParam);

    if (!practiceId || Number.isNaN(practiceId)) {
      return NextResponse.json({ error: 'Invalid practice id' }, { status: 400 });
    }

    // Ensure user belongs to this practice (or is super admin in future enhancement)
    if (user.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Check permission to read billing/invoices (allow either BILLING READ or INVOICE READ)
    const canReadBilling = hasPermission(user, ResourceType.BILLING, StandardAction.READ);
    const canReadInvoices = hasPermission(user, ResourceType.INVOICE, StandardAction.READ);
    const isAdministrator = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    if (!canReadBilling && !canReadInvoices && !isAdministrator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();

    const results = await tenantDb.query.invoices.findMany({
      where: and(eq(invoices.practiceId, practiceId)),
      with: {
        client: { columns: { name: true } },
        pet: { columns: { name: true } },
      },
      orderBy: [desc(invoices.createdAt)]
    });

    // Map to match front-end expectations
  const mapped = results.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.issueDate?.toString(),
      dueDate: inv.dueDate?.toString(),
      clientId: inv.clientId,
      petId: inv.petId,
      practiceId: inv.practiceId,
      status: inv.status as any,
      subtotal: inv.subtotal,
      tax: inv.taxAmount,
      total: inv.totalAmount,
      amountPaid: '0.00', // TODO: derive from payments aggregation
      clientName: (inv as any).client?.name,
      petName: (inv as any).pet?.name,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching practice invoices', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST create invoice (staff/admin)
export async function POST(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId: practiceIdParam } = await params;
    const practiceId = parseInt(practiceIdParam);
    if (user.practiceId !== practiceId) return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    const isAdministrator = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!isAdministrator && !hasPermission(user, ResourceType.INVOICE, StandardAction.CREATE)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const body = await request.json();
    const { clientId, petId, date, dueDate, notes, items } = body;
    if (!clientId || !date || !dueDate || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const tenantDb = await getCurrentTenantDb();

    const [invoiceCountResult] = await tenantDb.select({ count: count() }).from(invoices).where(eq(invoices.practiceId, practiceId));
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String((invoiceCountResult?.count || 0) + 1).padStart(3, '0')}`;

    // Calculate totals
    let subtotal = 0; let taxAmount = 0; const taxRate = 0.08;
    items.forEach((it: any) => { const line = parseFloat(it.subtotal); subtotal += line; if (it.taxable) taxAmount += line * taxRate; });
    const totalAmount = subtotal + taxAmount;

    const [created] = await tenantDb.insert(invoices).values({
      practiceId,
      clientId,
      petId: petId || null,
      description: notes || null,
      invoiceNumber,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discountAmount: '0.00',
      totalAmount: totalAmount.toFixed(2),
      issueDate: new Date(date),
      dueDate: new Date(dueDate),
      status: 'pending'
    }).returning();

    const lineItems = items.map((it: any) => ({
      invoiceId: created.id,
      description: it.description,
      quantity: it.quantity.toString(),
      unitPrice: (parseFloat(it.subtotal) / parseFloat(it.quantity || '1')).toFixed(2),
      subtotal: it.subtotal,
      discountAmount: it.discountAmount || '0.00',
      taxable: it.taxable ? 'yes' : 'no'
    }));
    if (lineItems.length) await tenantDb.insert(invoiceItems).values(lineItems);

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating invoice', e);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
