import { NextResponse, NextRequest } from "next/server";
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { boardingStays, invoices, invoiceItems, taxRates, practices } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Stay ID format' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { checkInById } = body;

    const currentUser = await getCurrentUser(request);

    // Check if the stay exists and is scheduled
    const existingStay = await tenantDb.query.boardingStays.findFirst({
      where: eq(boardingStays.id, id)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    if (existingStay.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled stays can be checked in' },
        { status: 400 }
      );
    }

    // Update the stay to checked_in status using tenantDb
    await tenantDb.update(boardingStays)
      .set({
        status: 'checked_in',
        checkInDate: new Date(),
        // If you have a checkInById field in your schema, uncomment the line below
        // checkInById: checkInById
      })
      .where(eq(boardingStays.id, id))
      .returning();

    // Fetch the complete updated stay data with relations
    const completeStay = await tenantDb.query.boardingStays.findFirst({
      where: eq(boardingStays.id, id),
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        kennel: true,
        createdBy: true
      }
    });

    // Create invoice for the stay server-side (if possible)
    try {
      if (completeStay?.pet?.owner?.id) {
        const clientId = completeStay.pet.owner.id;
        const petId = completeStay.pet.id;
        const dailyRate = parseFloat(completeStay.dailyRate || '0') || 0;
        // Determine duration: use plannedCheckOutDate - checkInDate
        const start = completeStay.checkInDate ? new Date(completeStay.checkInDate) : new Date();
        const end = completeStay.plannedCheckOutDate ? new Date(completeStay.plannedCheckOutDate) : start;
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        // Calculate subtotal and tax
        const subtotal = dailyRate * days;

        // Get default tax rate for practice
        const defaultTaxRate = await tenantDb.query.taxRates.findFirst({
          where: (t: any, { eq }: any) => eq(t.practiceId, completeStay.practiceId)
        });
        const taxRate = defaultTaxRate ? parseFloat(defaultTaxRate.rate) / 100 : 0;
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        // Generate invoice number
        const [countResult] = await tenantDb.select({ count: tenantDb.raw('count(*)') }).from(invoices).where(eq(invoices.practiceId, completeStay.practiceId as any)).catch(() => [{ count: 0 }]);
        const nextNum = (countResult?.count ?? 0) + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

        const practiceRow = await tenantDb.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, completeStay.practiceId) });
        const currencyId = (practiceRow as any)?.defaultCurrencyId || null;

        const [newInvoice] = await tenantDb.insert(invoices).values({
          practiceId: completeStay.practiceId,
          clientId,
          petId,
          description: `Boarding reservation ${completeStay.id}`,
          invoiceNumber,
          currencyId: currencyId,
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }).returning();

        const invoiceItem = {
          invoiceId: newInvoice.id,
          description: `Boarding - ${completeStay.pet.name}`,
          quantity: String(days),
          unitPrice: dailyRate.toFixed(2),
          subtotal: subtotal.toFixed(2),
          discountAmount: '0.00',
          taxable: 'yes'
        };

        await tenantDb.insert(invoiceItems).values(invoiceItem);

        // Optionally create audit log (if you have helper) - skipped here for brevity
        // attach invoice id to response
        (completeStay as any)._createdInvoiceId = newInvoice.id;
      }
    } catch (invErr) {
      console.error('Failed to create invoice during check-in:', invErr);
      // Don't fail the whole check-in if invoice creation fails
    }

    return NextResponse.json(completeStay, { status: 200 });
  } catch (error) {
    console.error('Error checking in boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to check in boarding stay due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
