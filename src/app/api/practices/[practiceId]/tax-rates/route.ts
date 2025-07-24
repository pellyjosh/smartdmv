import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';

// Mock tax rates data
const mockTaxRates = [
  {
    id: 1,
    name: 'Sales Tax',
    rate: 8.25,
    type: 'percentage',
    description: 'Standard sales tax',
    active: true
  },
  {
    id: 2,
    name: 'Service Tax',
    rate: 5.0,
    type: 'percentage',
    description: 'Tax on veterinary services',
    active: true
  }
];

// GET /api/practices/[practiceId]/tax-rates - Get tax rates for a practice
export async function GET(request: NextRequest, { params }: { params: { practiceId: string } }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const practiceId = parseInt(params.practiceId);
    
    // Verify user has access to this practice
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    return NextResponse.json(mockTaxRates);
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    );
  }
}
