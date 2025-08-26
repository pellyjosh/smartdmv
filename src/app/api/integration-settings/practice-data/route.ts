import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customFieldGroups, customFieldValues } from '@/db/schemas/customFieldsSchema';
import { practices, integrationApiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Simple API key validation
async function validateApiKeySimple(apiKey: string, practiceId: number): Promise<boolean> {
  try {
    const keyRecord = await db.query.integrationApiKeys.findFirst({
      where: and(
        eq(integrationApiKeys.practiceId, practiceId),
        eq(integrationApiKeys.keyHash, apiKey), // Assuming the key is stored as hash
        eq(integrationApiKeys.isActive, true)
      )
    });
    
    return !!keyRecord;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

// GET /api/integration-settings/practice-data?practiceId=1 - Get practice-specific data for widget configuration
export async function GET(request: NextRequest) {
  try {
    // Add CORS headers to response
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Get practiceId from query params
    const url = new URL(request.url);
    const practiceIdParam = url.searchParams.get('practiceId');
    
    if (!practiceIdParam) {
      return NextResponse.json({ error: 'Practice ID is required' }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const practiceId = parseInt(practiceIdParam);

    // Validate API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'API key required' }, { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const apiKey = authHeader.substring(7);
    const isValidKey = await validateApiKeySimple(apiKey, practiceId);
    
    if (!isValidKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { 
        status: 401,
        headers: corsHeaders 
      });
    }

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

    return NextResponse.json(practiceData, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error fetching practice data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}
