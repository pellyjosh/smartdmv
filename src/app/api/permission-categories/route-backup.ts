import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Mock permission categories data
const mockCategories = [
  {
    id: 'users_access',
    name: 'Users & Access',
    description: 'User management, roles, and authentication permissions',
    isActive: true,
    isSystemDefined: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    resources: [
      {
        id: 'users_resource',
        name: 'users',
        description: 'User account management',
        isActive: true,
        actions: [
          { id: 'users_create', name: 'CREATE', description: 'Create new users', isActive: true },
          { id: 'users_read', name: 'READ', description: 'View user information', isActive: true },
          { id: 'users_update', name: 'UPDATE', description: 'Update user information', isActive: true },
          { id: 'users_delete', name: 'DELETE', description: 'Delete users', isActive: true },
          { id: 'users_manage', name: 'MANAGE', description: 'Full user management', isActive: true },
        ]
      },
      {
        id: 'roles_resource',
        name: 'roles',
        description: 'Role and permission management',
        isActive: true,
        actions: [
          { id: 'roles_create', name: 'CREATE', description: 'Create new roles', isActive: true },
          { id: 'roles_read', name: 'READ', description: 'View roles', isActive: true },
          { id: 'roles_update', name: 'UPDATE', description: 'Update roles', isActive: true },
          { id: 'roles_delete', name: 'DELETE', description: 'Delete roles', isActive: true },
          { id: 'roles_manage', name: 'MANAGE', description: 'Full role management', isActive: true },
        ]
      }
    ]
  },
  {
    id: 'patients_records',
    name: 'Patients & Records',
    description: 'Patient information and medical record permissions',
    isActive: true,
    isSystemDefined: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    resources: [
      {
        id: 'patients_resource',
        name: 'patients',
        description: 'Patient information management',
        isActive: true,
        actions: [
          { id: 'patients_create', name: 'CREATE', description: 'Register new patients', isActive: true },
          { id: 'patients_read', name: 'READ', description: 'View patient information', isActive: true },
          { id: 'patients_update', name: 'UPDATE', description: 'Update patient information', isActive: true },
          { id: 'patients_delete', name: 'DELETE', description: 'Delete patient records', isActive: true },
        ]
      },
      {
        id: 'medical_records_resource',
        name: 'medical_records',
        description: 'Medical record management',
        isActive: true,
        actions: [
          { id: 'medical_records_create', name: 'CREATE', description: 'Create medical records', isActive: true },
          { id: 'medical_records_read', name: 'READ', description: 'View medical records', isActive: true },
          { id: 'medical_records_update', name: 'UPDATE', description: 'Update medical records', isActive: true },
          { id: 'medical_records_delete', name: 'DELETE', description: 'Delete medical records', isActive: false },
        ]
      },
      {
        id: 'appointments_resource',
        name: 'appointments',
        description: 'Appointment scheduling and management',
        isActive: true,
        actions: [
          { id: 'appointments_create', name: 'CREATE', description: 'Schedule appointments', isActive: true },
          { id: 'appointments_read', name: 'READ', description: 'View appointments', isActive: true },
          { id: 'appointments_update', name: 'UPDATE', description: 'Modify appointments', isActive: true },
          { id: 'appointments_delete', name: 'DELETE', description: 'Cancel appointments', isActive: true },
        ]
      }
    ]
  },
  {
    id: 'practice_management',
    name: 'Practice Management',
    description: 'Practice settings, billing, and administrative permissions',
    isActive: true,
    isSystemDefined: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    resources: [
      {
        id: 'practice_settings_resource',
        name: 'practice_settings',
        description: 'Practice configuration and settings',
        isActive: true,
        actions: [
          { id: 'practice_settings_read', name: 'READ', description: 'View practice settings', isActive: true },
          { id: 'practice_settings_update', name: 'UPDATE', description: 'Update practice settings', isActive: true },
          { id: 'practice_settings_manage', name: 'MANAGE', description: 'Full practice management', isActive: true },
        ]
      },
      {
        id: 'billing_resource',
        name: 'billing',
        description: 'Billing and financial management',
        isActive: true,
        actions: [
          { id: 'billing_create', name: 'CREATE', description: 'Create invoices', isActive: true },
          { id: 'billing_read', name: 'READ', description: 'View billing information', isActive: true },
          { id: 'billing_update', name: 'UPDATE', description: 'Update billing records', isActive: true },
          { id: 'billing_manage', name: 'MANAGE', description: 'Full billing management', isActive: true },
        ]
      }
    ]
  }
];

// GET permission categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // TODO: Implement database query for permission categories
    // For now, return mock data sorted by sortOrder
    const categories = mockCategories.sort((a, b) => a.sortOrder - b.sortOrder);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching permission categories:', error);
    return NextResponse.json({ error: 'Failed to fetch permission categories' }, { status: 500 });
  }
}

// POST create permission category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const categorySchema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().default(0),
      practiceId: z.number()
    });

    const validatedData = categorySchema.parse(body);

    // TODO: Implement database insertion for permission category
    const newCategory = {
      id: `category_${Date.now()}`,
      name: validatedData.name,
      description: validatedData.description || '',
      isActive: validatedData.isActive,
      isSystemDefined: false,
      sortOrder: validatedData.sortOrder,
      createdAt: new Date().toISOString(),
      resources: []
    };

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating permission category:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create permission category' }, { status: 500 });
  }
}
