import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customFieldGroups, customFieldValues } from '@/db/schemas/customFieldsSchema';
import { practices, integrationApiKeys, integrationSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Simple API key validation
async function validateApiKeySimple(apiKey: string, practiceId: number): Promise<boolean> {
  try {
    // Hash the incoming API key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyRecord = await db.query.integrationApiKeys.findFirst({
      where: and(
        eq(integrationApiKeys.practiceId, practiceId),
        eq(integrationApiKeys.keyHash, keyHash),
        eq(integrationApiKeys.isActive, true)
      )
    });
    
    return !!keyRecord;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('practiceId');
    const apiKey = searchParams.get('apiKey');

    if (!practiceId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing practiceId or apiKey' },
        { status: 400, headers: corsHeaders }
      );
    }

    const practiceIdNumber = parseInt(practiceId, 10);
    if (isNaN(practiceIdNumber)) {
      return NextResponse.json(
        { error: 'Invalid practiceId' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate API key
    const isValidKey = await validateApiKeySimple(apiKey, practiceIdNumber);
    if (!isValidKey) {
      return NextResponse.json(
        { error: 'Invalid API key or practice ID' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get practice details
    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, practiceIdNumber)
    });

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get custom field groups for this practice
    const fieldGroups = await db.select().from(customFieldGroups)
      .where(eq(customFieldGroups.practiceId, practiceIdNumber));

    // Get custom field values for this practice
    const fieldValues = await db.select().from(customFieldValues)
      .where(eq(customFieldValues.practiceId, practiceIdNumber));

    // Transform field groups and values into the expected format
    const customFields = fieldGroups.map(group => {
      const groupValues = fieldValues.filter(value => value.groupId === group.id);
      
      return {
        id: group.id,
        name: group.name,
        key: group.key,
        description: group.description,
        values: groupValues.map(value => ({
          id: value.id,
          value: value.value,
          label: value.label,
          isActive: value.isActive
        }))
      };
    });

    // Get integration settings for this practice
    const integration = await db.query.integrationSettings.findFirst({
      where: eq(integrationSettings.practiceId, practiceIdNumber)
    });

    let appointmentTypes: any[] = [];
    let enabledFields = {};
    let customTexts: {
      headerTitle?: string;
      headerSubtitle?: string;
      appointmentTypeLabel?: string;
      dateLabel?: string;
      timeLabel?: string;
      contactLabel?: string;
      submitButton?: string;
      cancelButton?: string;
      buttonText?: string;
      successMessage?: string;
      footerText?: string;
      errorMessage?: string;
      [key: string]: any;
    } = {};
    
    // Default styling values
    let stylingConfig = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      borderRadius: 8,
      primaryColor: '#3B82F6',
      backgroundColor: '#ffffff',
      textColor: '#1F2937'
    };
    let widgetSettings = [];
    if (integration && integration.widgetSettings && typeof integration.widgetSettings === 'string') {
      try {
        widgetSettings = JSON.parse(integration.widgetSettings);
        appointmentTypes = (widgetSettings.appointmentTypes || []).filter((type: any) => type.enabled);
        enabledFields = widgetSettings.requiredFields || {};
        customTexts = widgetSettings.customTexts || {};
        
        // Extract styling configuration from integration settings
        if (widgetSettings.fontFamily && widgetSettings.borderRadius && widgetSettings.primaryColor && widgetSettings.backgroundColor && widgetSettings.textColor) {
          stylingConfig = {
            fontFamily: stylingConfig.fontFamily,
            borderRadius: stylingConfig.borderRadius,
            primaryColor: stylingConfig.primaryColor,
            backgroundColor: stylingConfig.backgroundColor,
            textColor: stylingConfig.textColor
          };
        }
      } catch (error) {
        console.error('Error parsing widget settings:', error);
      }
    }

    // If no appointment types are configured, return empty array
    if (appointmentTypes.length === 0) {
      appointmentTypes = [];
    }

    // Build widget configuration
    const config = {
      practice: {
        id: practice.id,
        name: practice.name,
      },
      appointmentTypes: appointmentTypes,
      customFields: customFields,
      enabledFields: enabledFields,
      customTexts: {
        headerTitle: customTexts.headerTitle || `Book an Appointment with ${practice.name}`,
        headerSubtitle: customTexts.headerSubtitle || 'Choose your preferred appointment type and time',
        appointmentTypeLabel: customTexts.appointmentTypeLabel || 'Select Service',
        dateLabel: customTexts.dateLabel || 'Choose Date',
        timeLabel: customTexts.timeLabel || 'Select Time',
        contactLabel: customTexts.contactLabel || 'Your Information',
        submitButton: customTexts.submitButton || 'Book Appointment',
        cancelButton: customTexts.cancelButton || 'Cancel',
        buttonText: customTexts.buttonText || 'Book Appointment',
        successMessage: customTexts.successMessage || 'Appointment Booked Successfully!',
        footerText: customTexts.footerText || 'We will contact you shortly to confirm your appointment.',
        errorMessage: customTexts.errorMessage || 'Sorry, there was an error booking your appointment. Please try again.'
      },
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timeSlotDuration: 30, // minutes
      advanceBookingDays: 30, // How many days in advance can appointments be booked
      requiredFields: enabledFields,
      settings: {
        theme: 'default',
        showPetInfo: true,
        showEmergencyContact: true,
      },
      // Widget styling and positioning from integration settings
     fontFamily: widgetSettings.fontFamily || stylingConfig.fontFamily,
    borderRadius: widgetSettings.borderRadius || stylingConfig.borderRadius,
    primaryColor: widgetSettings.primaryColor || stylingConfig.primaryColor,
    backgroundColor: widgetSettings.backgroundColor || stylingConfig.backgroundColor,
    textColor: widgetSettings.textColor || stylingConfig.textColor

      
    };

    return NextResponse.json(config, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Widget config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
