import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices, invoiceItems, payments } from '@/db/schemas/billingSchema';
import { users } from '@/db/schemas/usersSchema';
import { pets } from '@/db/schemas/petsSchema';
import { and, eq } from 'drizzle-orm';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { hasPermission } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';

// GET /api/practices/[practiceId]/invoices/[id] - Get a specific invoice
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ practiceId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdParam, id: invoiceIdParam } = await params;
    const practiceId = parseInt(practiceIdParam);
    const invoiceId = parseInt(invoiceIdParam);

    if (!practiceId || Number.isNaN(practiceId)) {
      return NextResponse.json({ error: 'Invalid practice id' }, { status: 400 });
    }

    if (!invoiceId || Number.isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
    }

    // Ensure user belongs to this practice
    if (user.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Check permission to read billing/invoices
    const canReadBilling = hasPermission(user, ResourceType.BILLING, StandardAction.READ);
    const canReadInvoices = hasPermission(user, ResourceType.INVOICE, StandardAction.READ);
    const isAdministrator = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!canReadBilling && !canReadInvoices && !isAdministrator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Fetch the invoice with all related data
    const invoice = await tenantDb.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.practiceId, practiceId)
      ),
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true
          }
        },
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
            breed: true,
            age: true
          }
        },
        items: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate totals
    const subtotal = invoice.items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.quantity.toString()) * parseFloat(item.unitPrice.toString()));
    }, 0);

    const totalTax = parseFloat(invoice.taxAmount?.toString() || '0');

    const total = subtotal + totalTax;

    // Format the response
    const formattedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: subtotal,
      totalTax: totalTax,
      total: total,
      notes: invoice.notes,
      client: invoice.client,
      pet: invoice.pet,
      items: invoice.items.map((item: any) => ({
        id: item.id,
        type: item.type,
        serviceCode: item.serviceCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        taxRate: item.taxRate ? {
          id: item.taxRate.id,
          name: item.taxRate.name,
          rate: item.taxRate.rate,
          type: item.taxRate.type
        } : null,
        taxAmount: item.taxRate ? (item.quantity * item.unitPrice * (item.taxRate.rate / 100)) : 0
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    };

    return NextResponse.json(formattedInvoice);

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/practices/[practiceId]/invoices/[id] - Update invoice status
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ practiceId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdParam, id: invoiceIdParam } = await params;
    const practiceId = parseInt(practiceIdParam);
    const invoiceId = parseInt(invoiceIdParam);

    if (!practiceId || Number.isNaN(practiceId)) {
      return NextResponse.json({ error: 'Invalid practice id' }, { status: 400 });
    }

    if (!invoiceId || Number.isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
    }

    // Ensure user belongs to this practice
    if (user.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Check permission to update invoices
    const canUpdateInvoices = hasPermission(user, ResourceType.INVOICE, StandardAction.UPDATE);
    const isAdministrator = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!canUpdateInvoices && !isAdministrator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { status, paymentMethod, notes } = body;

    if (!status || !['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Get the current invoice to check previous status
    const currentInvoice = await tenantDb.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.practiceId, practiceId)
      )
    });

    if (!currentInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const previousStatus = currentInvoice.status;
    const isBeingMarkedAsPaid = status === 'PAID' && previousStatus !== 'PAID';

    // Auto-generate transaction ID if being marked as paid
    const transactionId = isBeingMarkedAsPaid ? `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null;

    // Update the invoice
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };

    // If being marked as paid, set the paid date
    if (isBeingMarkedAsPaid) {
      updateData.paidDate = new Date();
    }

    const [updatedInvoice] = await tenantDb
      .update(invoices)
      .set(updateData)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.practiceId, practiceId)
      ))
      .returning();

    if (!updatedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create audit log for status change
    await createAuditLog({
      action: 'UPDATE',
      recordType: 'BILLING',
      recordId: invoiceId.toString(),
      description: `Invoice ${updatedInvoice.invoiceNumber} status changed from ${previousStatus} to ${status}`,
      userId: user.id.toString(),
      practiceId: practiceId.toString(),
      metadata: {
        invoiceNumber: updatedInvoice.invoiceNumber,
        previousStatus,
        newStatus: status,
        actionBy: user.name || user.email,
        paymentMethod: paymentMethod || null,
        transactionId: transactionId
      },
      changes: {
        before: { status: previousStatus },
        after: { status: status }
      }
    });

    // If invoice is being marked as paid, create a payment record
    if (isBeingMarkedAsPaid) {
      const paymentData = {
        practiceId: practiceId,
        invoiceId: invoiceId,
        clientId: currentInvoice.clientId,
        paymentNumber: `PAY-${Date.now()}`,
        amount: updatedInvoice.totalAmount,
        paymentMethod: paymentMethod || 'other',
        status: 'completed',
        paymentDate: new Date(),
        transactionId: transactionId,
        notes: notes || `Payment recorded by ${user.name || user.email} when marking invoice as paid`
      };

      await tenantDb.insert(payments).values(paymentData);

      // Create audit log for payment creation
      await createAuditLog({
        action: 'CREATE',
        recordType: 'BILLING',
        recordId: invoiceId.toString(),
        description: `Payment record created for invoice ${updatedInvoice.invoiceNumber}`,
        userId: user.id.toString(),
        practiceId: practiceId.toString(),
        metadata: {
          invoiceNumber: updatedInvoice.invoiceNumber,
          paymentAmount: updatedInvoice.totalAmount,
          paymentMethod: paymentMethod || 'other',
          actionBy: user.name || user.email,
          transactionId: transactionId
        }
      });
    }

    return NextResponse.json({
      ...updatedInvoice,
      actionBy: user.name || user.email,
      actionDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}