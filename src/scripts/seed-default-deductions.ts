import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { deductionTypes } from '@/db/schemas/financeSchema';

// Script to seed default deduction types for payroll
async function seedDefaultDeductionTypes(practiceId: number) {
  const tenantDb = await getCurrentTenantDb();

  const defaultDeductions = [
    // Tax Deductions
    {
      practiceId,
      name: 'Federal Income Tax',
      code: 'FIT',
      category: 'tax' as const,
      description: 'Federal income tax withholding',
      calculationType: 'tiered' as const,
      isEmployerContribution: false,
      displayOrder: 1
    },
    {
      practiceId,
      name: 'Social Security Tax',
      code: 'FICA_SS',
      category: 'tax' as const,
      description: 'Social Security tax (6.2%)',
      calculationType: 'percentage' as const,
      isEmployerContribution: false,
      displayOrder: 2
    },
    {
      practiceId,
      name: 'Medicare Tax',
      code: 'FICA_MED',
      category: 'tax' as const,
      description: 'Medicare tax (1.45%)',
      calculationType: 'percentage' as const,
      isEmployerContribution: false,
      displayOrder: 3
    },
    {
      practiceId,
      name: 'State Income Tax',
      code: 'SIT',
      category: 'tax' as const,
      description: 'State income tax withholding',
      calculationType: 'tiered' as const,
      isEmployerContribution: false,
      displayOrder: 4
    },
    // Benefit Deductions
    {
      practiceId,
      name: 'Health Insurance',
      code: 'HEALTH',
      category: 'benefit' as const,
      description: 'Employee health insurance premium',
      calculationType: 'fixed' as const,
      isEmployerContribution: false,
      displayOrder: 10
    },
    {
      practiceId,
      name: 'Dental Insurance',
      code: 'DENTAL',
      category: 'benefit' as const,
      description: 'Employee dental insurance premium',
      calculationType: 'fixed' as const,
      isEmployerContribution: false,
      displayOrder: 11
    },
    {
      practiceId,
      name: 'Vision Insurance',
      code: 'VISION',
      category: 'benefit' as const,
      description: 'Employee vision insurance premium',
      calculationType: 'fixed' as const,
      isEmployerContribution: false,
      displayOrder: 12
    },
    {
      practiceId,
      name: '401k Contribution',
      code: '401K',
      category: 'benefit' as const,
      description: 'Employee 401k retirement contribution',
      calculationType: 'percentage' as const,
      isEmployerContribution: false,
      displayOrder: 13
    },
    // Voluntary Deductions
    {
      practiceId,
      name: 'Parking',
      code: 'PARKING',
      category: 'voluntary' as const,
      description: 'Monthly parking fee',
      calculationType: 'fixed' as const,
      isEmployerContribution: false,
      displayOrder: 20
    },
    {
      practiceId,
      name: 'Union Dues',
      code: 'UNION',
      category: 'voluntary' as const,
      description: 'Union membership dues',
      calculationType: 'fixed' as const,
      isEmployerContribution: false,
      displayOrder: 21
    },
    {
      practiceId,
      name: 'Charitable Giving',
      code: 'CHARITY',
      category: 'voluntary' as const,
      description: 'Charitable contribution deduction',
      calculationType: 'fixed' as const,
      isEmployerContribution: false,
      displayOrder: 22
    }
  ];

  try {
    for (const deduction of defaultDeductions) {
      await tenantDb.insert(deductionTypes).values(deduction);
    }
    
    console.log(`Successfully seeded ${defaultDeductions.length} default deduction types for practice ${practiceId}`);
    return { success: true, count: defaultDeductions.length };
  } catch (error) {
    console.error('Error seeding deduction types:', error);
    throw error;
  }
}

export { seedDefaultDeductionTypes };