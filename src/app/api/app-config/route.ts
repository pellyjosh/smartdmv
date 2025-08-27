import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the base URL from environment variables with proper fallback hierarchy
    const baseUrl = process.env.APP_BASE_URL || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? 'https://version3demo.smartdvm.com' 
                     : 'http://localhost:9002');

    const config = {
      baseUrl,
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error getting app config:', error);
    return NextResponse.json(
      { error: 'Failed to get app configuration' },
      { status: 500 }
    );
  }
}
