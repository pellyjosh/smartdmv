import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { bankAccounts } from '@/db/schemas/financeSchema';
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

    const tenantDb = await getCurrentTenantDb();
    
    const accounts = await tenantDb.select({
      id: bankAccounts.id,
      accountName: bankAccounts.accountName,
      accountType: bankAccounts.accountType,
      bankName: bankAccounts.bankName,
      routingNumber: bankAccounts.routingNumber,
      accountNumber: bankAccounts.accountNumber,
      isActive: bankAccounts.isActive,
      isDefault: bankAccounts.isDefault,
      balance: bankAccounts.balance,
      createdAt: bankAccounts.createdAt
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.practiceId, practiceId));

    // Mask account numbers for security
    const maskedAccounts = accounts.map((account: typeof bankAccounts.$inferSelect) => ({
      ...account,
      accountNumber: `****${account.accountNumber.slice(-4)}`,
      routingNumber: `****${account.routingNumber.slice(-4)}`
    }));

    return NextResponse.json(maskedAccounts);

  } catch (error) {
    console.error('List bank accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to list bank accounts' },
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
      accountName, 
      accountType, 
      bankName, 
      routingNumber, 
      accountNumber, 
      isDefault 
    } = body;

    if (!accountName || !accountType || !bankName || !routingNumber || !accountNumber) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();

    // If this account is being set as default, unset other defaults
    if (isDefault) {
      await tenantDb.update(bankAccounts)
        .set({ isDefault: false })
        .where(and(
          eq(bankAccounts.practiceId, practiceId),
          eq(bankAccounts.isDefault, true)
        ));
    }

    const [newAccount] = await tenantDb.insert(bankAccounts).values({
      practiceId,
      accountName,
      accountType,
      bankName,
      routingNumber,
      accountNumber,
      isDefault: isDefault || false,
      isActive: true,
      balance: '0.00'
    }).returning();

    // Return masked account info
    const maskedAccount = {
      ...newAccount,
      accountNumber: `****${newAccount.accountNumber.slice(-4)}`,
      routingNumber: `****${newAccount.routingNumber.slice(-4)}`
    };

    return NextResponse.json(maskedAccount, { status: 201 });

  } catch (error) {
    console.error('Create bank account error:', error);
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    );
  }
}