import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';

// Mock dashboard configuration data
const defaultDashboardConfig = {
  id: 'default',
  practiceId: null,
  userId: null,
  name: 'Default Dashboard',
  isDefault: true,
  layout: {
    widgets: [
      {
        id: 'appointments-today',
        type: 'appointments',
        title: 'Today\'s Appointments',
        position: { x: 0, y: 0, width: 6, height: 4 },
        config: { timeframe: 'today' }
      },
      {
        id: 'pending-requests',
        type: 'appointment-requests',
        title: 'Pending Requests',
        position: { x: 6, y: 0, width: 6, height: 4 },
        config: { status: 'pending' }
      },
      {
        id: 'low-stock-alerts',
        type: 'inventory-alerts',
        title: 'Low Stock Alerts',
        position: { x: 0, y: 4, width: 6, height: 3 },
        config: { alertType: 'low-stock' }
      },
      {
        id: 'recent-activities',
        type: 'activities',
        title: 'Recent Activities',
        position: { x: 6, y: 4, width: 6, height: 3 },
        config: { limit: 10 }
      }
    ]
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// GET /api/dashboard-configs - Get dashboard configurations for the user
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, you'd fetch from database
    // For now, return the default configuration
    return NextResponse.json([defaultDashboardConfig]);
  } catch (error) {
    console.error('Error fetching dashboard configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard configurations' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard-configs - Create a new dashboard configuration
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // In a real implementation, you'd save to database
    const newConfig = {
      id: `config_${Date.now()}`,
      practiceId: userPractice.practiceId,
      userId: userPractice.userId,
      name: body.name || 'Custom Dashboard',
      isDefault: false,
      layout: body.layout || defaultDashboardConfig.layout,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard configuration' },
      { status: 500 }
    );
  }
}
