import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { employeeBankAccounts } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const tenantDb = await getCurrentTenantDb();
    
    let query = tenantDb.select({
      id: employeeBankAccounts.id,
      employeeId: employeeBankAccounts.employeeId,
      accountType: employeeBankAccounts.accountType,
      bankName: employeeBankAccounts.bankName,
      routingNumber: employeeBankAccounts.routingNumber,
      accountNumber: employeeBankAccounts.accountNumber,
      accountHolderName: employeeBankAccounts.accountHolderName,
      isActive: employeeBankAccounts.isActive,
      isPrimary: employeeBankAccounts.isPrimary,
      allocationPercentage: employeeBankAccounts.allocationPercentage,
      employeeName: users.name,
      employeeEmail: users.email
    })
    .from(employeeBankAccounts)
    .leftJoin(users, eq(users.id, employeeBankAccounts.employeeId))
    .where(eq(employeeBankAccounts.practiceId, practiceId));

    if (employeeId) {
      query = query.where(eq(employeeBankAccounts.employeeId, Number(employeeId)));
    }

    const accounts = await query;

    // Mask account numbers for security
    const maskedAccounts = accounts.map((account: any) => ({
      ...account,
      accountNumber: `****${account.accountNumber.slice(-4)}`,
      routingNumber: `****${account.routingNumber.slice(-4)}`
    }));

    return NextResponse.json(maskedAccounts);

  } catch (error) {
    console.error('List employee bank accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to list employee bank accounts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      employeeId,
      accountType, 
      bankName, 
      routingNumber, 
      accountNumber,
      accountHolderName,
      isPrimary,
      allocationPercentage 
    } = body;

    if (!employeeId || !accountType || !bankName || !routingNumber || !accountNumber || !accountHolderName) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();

    // If this account is being set as primary, unset other primary accounts for this employee
    if (isPrimary) {
      await tenantDb.update(employeeBankAccounts)
        .set({ isPrimary: false })
        .where(and(
          eq(employeeBankAccounts.practiceId, practiceId),
          eq(employeeBankAccounts.employeeId, Number(employeeId)),
          eq(employeeBankAccounts.isPrimary, true)
        ));
    }

    const [newAccount] = await tenantDb.insert(employeeBankAccounts).values({
      practiceId,
      employeeId: Number(employeeId),
      accountType,
      bankName,
      routingNumber,
      accountNumber,
      accountHolderName,
      isPrimary: isPrimary || false,
      allocationPercentage: allocationPercentage || '100.00',
      isActive: true
    }).returning();

    // Return masked account info
    const maskedAccount = {
      ...newAccount,
      accountNumber: `****${newAccount.accountNumber.slice(-4)}`,
      routingNumber: `****${newAccount.routingNumber.slice(-4)}`
    };

    return NextResponse.json(maskedAccount, { status: 201 });

  } catch (error) {
    console.error('Create employee bank account error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee bank account' },
      { status: 500 }
    );
  }
}