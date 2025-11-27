import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get the base URL from environment variables with proper fallback hierarchy
    const baseUrl = process.env.APP_BASE_URL || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   (() => {
                     const host = req.headers.get('host') || 'localhost:9002';
                     const proto = req.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
                     return `${proto}://${host}`;
                   })();

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
