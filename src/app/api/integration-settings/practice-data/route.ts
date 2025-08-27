import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customFieldGroups, customFieldValues } from '@/db/schemas/customFieldsSchema';
import { practices, integrationApiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';

// GET /api/integration-settings/practice-data - Get practice-specific data for widget configuration (Admin route)
export async function GET(request: NextRequest) {
  try {
    // Use admin authentication instead of API key validation
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const practiceId = parseInt(userPractice.practiceId);

    // Get appointment types from custom fields
    const appointmentTypesGroup = await db.query.customFieldGroups.findFirst({
      where: and(
        eq(customFieldGroups.practiceId, practiceId),
        eq(customFieldGroups.key, 'appointment_types')
      )
    });

    let appointmentTypes: Array<{
      id: string;
      name: string;
      duration: number;
      description: string;
      color: string;
      enabled: boolean;
    }> = [];

    if (appointmentTypesGroup) {
      const appointmentTypeValues = await db.query.customFieldValues.findMany({
        where: eq(customFieldValues.groupId, appointmentTypesGroup.id)
      });

      appointmentTypes = appointmentTypeValues.map(value => {
        // Simple approach - use value directly or parse if needed
        let name = '';
        let duration = 30;
        let description = '';
        let color = '#3b82f6';
        let enabled = true;

        if (Array.isArray(value.value)) {
          name = value.value[0] || 'Unnamed Service';
        } else if (typeof value.value === 'string') {
          // Try to parse as JSON if it looks like JSON
          try {
            if (value.value.startsWith('{')) {
              const parsed = JSON.parse(value.value);
              name = parsed.name || 'Unnamed Service';
              duration = parsed.duration || 30;
              description = parsed.description || '';
              color = parsed.color || '#3b82f6';
              enabled = parsed.enabled !== false;
            } else {
              name = value.value;
            }
          } catch (e) {
            name = value.value;
          }
        } else {
          name = 'Unnamed Service';
        }

        return {
          id: value.id.toString(),
          name,
          duration,
          description,
          color,
          enabled
        };
      });
    }

    // Get practice information
    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, practiceId)
    });

    const practiceData = {
      practice: {
        id: practiceId,
        name: Array.isArray(practice?.name) ? practice.name[0] : practice?.name || 'Your Practice',
        email: '',
        phone: '',
        address: '',
        website: ''
      },
      appointmentTypes,
      // Return null for settings - widget will use configuration from embed code
      settings: null
    };

    return NextResponse.json(practiceData);
  } catch (error) {
    console.error('Error fetching practice data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500
    });
  }
}
