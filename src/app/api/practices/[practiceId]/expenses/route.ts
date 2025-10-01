import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { expenses, EXPENSE_STATUS } from '@/db/schemas/financeSchema';
import { and, eq, desc, gte, lte, sql, ilike, or } from 'drizzle-orm';

// Build where conditions based on filters
function buildFilters(practiceId: number, searchParams: URLSearchParams) {
  const clauses: any[] = [eq(expenses.practiceId, practiceId)];
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const minAmount = searchParams.get('minAmount');
  const maxAmount = searchParams.get('maxAmount');
  const search = searchParams.get('search');

  if (status && status !== 'all_statuses') clauses.push(eq(expenses.status, status));
  if (category && category !== 'all_categories') clauses.push(eq(expenses.category, category));
  if (startDate) clauses.push(gte(expenses.expenseDate, new Date(startDate)));
  if (endDate) clauses.push(lte(expenses.expenseDate, new Date(endDate)));
  if (minAmount) clauses.push(gte(sql`CAST(${expenses.amount} AS DECIMAL)`, minAmount));
  if (maxAmount) clauses.push(lte(sql`CAST(${expenses.amount} AS DECIMAL)`, maxAmount));
  if (search) {
    // Basic ILIKE search on description & vendor
    clauses.push(or(ilike(expenses.description, `%${search}%`), ilike(expenses.vendor, `%${search}%`)));
  }
  return clauses;
}

// GET /api/practices/[practiceId]/expenses
export async function GET(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const tenantDb = await getCurrentTenantDb();

    const clauses = buildFilters(practiceId, searchParams);
    const where = and(...clauses);

    const rows = await tenantDb.select().from(expenses).where(where).orderBy(desc(expenses.expenseDate));

  type ExpenseRow = typeof rows[number];
  const mapped = rows.map((r: ExpenseRow) => {
      // Parse notes JSON if present for extended metadata
      let meta: any = {};
      if (r.notes) {
        try { meta = JSON.parse(r.notes); } catch {}
      }
      const description = r.description || '';
      const titleSplit = description.split(' - ');
      // If we stored title + description combined, attempt to recover title
      const inferredTitle = titleSplit.length > 1 ? titleSplit[0] : (description || r.category);
      const remainingDescription = titleSplit.length > 1 ? description.substring(inferredTitle.length + 3) : description;
      return {
        id: r.id,
        practiceId: r.practiceId,
        title: inferredTitle,
        description: remainingDescription || null,
        amount: r.amount,
        date: r.expenseDate,
        category: r.category,
        subcategory: r.subcategory,
        vendorName: r.vendor,
        invoiceNumber: r.invoiceNumber,
        paymentMethod: meta.paymentMethod || null,
        isRecurring: !!meta.isRecurring,
        recurrenceType: meta.recurrenceType || null,
        recurrenceEndDate: meta.recurrenceEndDate || null,
        taxDeductible: !!meta.taxDeductible,
        status: r.status,
        receiptUrl: meta.receiptUrl || null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return NextResponse.json(mapped);
  } catch (e) {
    console.error('Error listing expenses', e);
    return NextResponse.json({ error: 'Failed to list expenses' }, { status: 500 });
  }
}

// POST /api/practices/[practiceId]/expenses
export async function POST(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const body = await request.json();
    const { title, description, amount, date, category, subcategory, vendorName, invoiceNumber, status, paymentMethod, isRecurring, recurrenceType, recurrenceEndDate, taxDeductible } = body;
    if ((amount == null || amount === '') || !date || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const tenantDb = await getCurrentTenantDb();
    const meta = {
      paymentMethod: paymentMethod || null,
      isRecurring: !!isRecurring,
      recurrenceType: isRecurring ? (recurrenceType || null) : null,
      recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      taxDeductible: !!taxDeductible,
    };
    const [created] = await tenantDb.insert(expenses).values({
      practiceId,
      amount: amount.toString(),
      category,
      subcategory: subcategory || null,
      description: title ? `${title}${description ? ' - ' + description : ''}` : (description || title || category),
      vendor: vendorName || null,
      invoiceNumber: invoiceNumber || null,
      expenseDate: new Date(date),
      status: status || 'pending',
      notes: JSON.stringify(meta)
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating expense', e);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}