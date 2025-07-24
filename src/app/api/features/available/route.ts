import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';

// Mock feature data - in a real app this would come from a database
const availableFeatures = [
  {
    id: 'inventory_management',
    name: 'Inventory Management',
    description: 'Track medication and supply inventory',
    enabled: true,
    category: 'core'
  },
  {
    id: 'appointment_scheduling',
    name: 'Appointment Scheduling',
    description: 'Schedule and manage appointments',
    enabled: true,
    category: 'core'
  },
  {
    id: 'client_management',
    name: 'Client Management',
    description: 'Manage client information and pets',
    enabled: true,
    category: 'core'
  },
  {
    id: 'drug_interactions',
    name: 'Drug Interactions',
    description: 'Check for medication interactions',
    enabled: false,
    category: 'marketplace'
  },
  {
    id: 'controlled_substances',
    name: 'Controlled Substance Tracking',
    description: 'Track controlled substances',
    enabled: false,
    category: 'marketplace'
  },
  {
    id: 'advanced_reporting',
    name: 'Advanced Reporting',
    description: 'Generate detailed reports',
    enabled: false,
    category: 'marketplace'
  }
];

// GET /api/features/available - Get available features for the practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, you'd check the practice's subscription
    // and return only the features they have access to
    return NextResponse.json(availableFeatures);
  } catch (error) {
    console.error('Error fetching available features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available features' },
      { status: 500 }
    );
  }
}
