import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices, invoiceItems, payments, taxRates } from '@/db/schema';
import { hasPermission } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/billing/invoices - Get invoices for current client
export async function GET(request: NextRequest) {
  try {
    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();
    
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can view their own invoices
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let whereConditions = [eq(invoices.clientId, user.id)];
    
    if (status) {
      whereConditions.push(eq(invoices.status, status as any));
    }

    console.log('[API /billing/invoices] Fetching invoices for client:', user.id);

    const userInvoices = await tenantDb.query.invoices.findMany({
      where: and(...whereConditions),
      with: {
        items: true,
        payments: true,
        pet: {
          columns: {
            name: true,
          }
        }
      },
      orderBy: [desc(invoices.createdAt)],
    });

    console.log('[API /billing/invoices] Found invoices:', userInvoices.length);

    return NextResponse.json(userInvoices);

  } catch (error) {
    console.error('[API /billing/invoices] Error fetching invoices:', error);
    console.error('[API /billing/invoices] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/billing/invoices - Create new invoice (admin only)
const createInvoiceSchema = z.object({
  clientId: z.number(),
  petId: z.number().optional(),
  appointmentId: z.number().optional(),
  description: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    discountAmount: z.number().default(0),
    taxable: z.enum(['yes', 'no']).default('yes'),
  })),
});

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(user, ResourceType.INVOICE, StandardAction.CREATE)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const data = await request.json();
    const validationResult = createInvoiceSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const itemsData = validatedData.items as any[];
    const invoiceInfo = {
      clientId: validatedData.clientId,
      petId: validatedData.petId,
      appointmentId: validatedData.appointmentId,
      description: validatedData.description,
      issueDate: validatedData.issueDate,
      dueDate: validatedData.dueDate,
    };

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    
    // Get the default tax rate for the practice
    const defaultTaxRate = await tenantDb.query.taxRates.findFirst({
      where: and(
        eq(taxRates.practiceId, user.practiceId!),
        eq(taxRates.isDefault, 'yes'),
        eq(taxRates.active, 'yes')
      )
    });
    
    const taxRate = defaultTaxRate ? parseFloat(defaultTaxRate.rate) / 100 : 0.08; // Default to 8% if no tax rate configured

    itemsData.forEach((item: any) => {
      const itemSubtotal = (item.quantity * item.unitPrice) - item.discountAmount;
      subtotal += itemSubtotal;
      if (item.taxable === 'yes') {
        taxAmount += itemSubtotal * taxRate;
      }
    });

    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const [invoiceCountResult] = await tenantDb.select({ count: count() }).from(invoices).where(eq(invoices.practiceId, user.practiceId!));
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String((invoiceCountResult?.count || 0) + 1).padStart(3, '0')}`;

    // Determine practice default currency
    const practice = await tenantDb.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, user.practiceId) });
    const defaultCurrencyId = (practice as any)?.defaultCurrencyId || undefined;

    // Create invoice
    const [newInvoice] = await tenantDb.insert(invoices).values({
      practiceId: user.practiceId!,
      clientId: invoiceInfo.clientId as number,
      petId: invoiceInfo.petId as number || null,
      appointmentId: invoiceInfo.appointmentId as number || null,
      description: invoiceInfo.description as string || null,
      invoiceNumber,
      currencyId: defaultCurrencyId,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      issueDate: new Date(invoiceInfo.issueDate as string),
      dueDate: new Date(invoiceInfo.dueDate as string),
    }).returning();

    // Create invoice items
    const invoiceItemsToInsert = itemsData.map((item: any) => ({
      invoiceId: newInvoice.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toFixed(2),
      subtotal: ((item.quantity * item.unitPrice) - item.discountAmount).toFixed(2),
      discountAmount: item.discountAmount.toFixed(2),
      taxable: item.taxable,
    }));

    await tenantDb.insert(invoiceItems).values(invoiceItemsToInsert);

    // Create audit log
    await createAuditLog({
      userId: user.id.toString(),
      practiceId: user.practiceId!.toString(),
      action: 'CREATE',
      recordType: 'BILLING',
      recordId: newInvoice.id.toString(),
      description: `Created invoice ${invoiceNumber}`,
    });

    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    console.error('[API] Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
