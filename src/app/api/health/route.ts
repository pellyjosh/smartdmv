import { NextResponse } from 'next/server';

// Simple health check endpoint that doesn't require database connection
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'online'
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
