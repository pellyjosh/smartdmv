import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';

// Mock service codes data
const mockServiceCodes = [
  {
    id: 1,
    code: 'EXAM001',
    name: 'Wellness Examination',
    description: 'Comprehensive wellness examination',
    category: 'Examination',
    basePrice: 75.00,
    duration: 30,
    active: true
  },
  {
    id: 2,
    code: 'VAC001',
    name: 'Core Vaccinations',
    description: 'Core vaccination series',
    category: 'Vaccination',
    basePrice: 45.00,
    duration: 15,
    active: true
  },
  {
    id: 3,
    code: 'SURG001',
    name: 'Spay/Neuter',
    description: 'Spay or neuter surgery',
    category: 'Surgery',
    basePrice: 250.00,
    duration: 120,
    active: true
  },
  {
    id: 4,
    code: 'DENT001',
    name: 'Dental Cleaning',
    description: 'Professional dental cleaning',
    category: 'Dental',
    basePrice: 180.00,
    duration: 90,
    active: true
  }
];

// GET /api/practices/[practiceId]/service-codes - Get service codes for a practice
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

    return NextResponse.json(mockServiceCodes);
  } catch (error) {
    console.error('Error fetching service codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service codes' },
      { status: 500 }
    );
  }
}
