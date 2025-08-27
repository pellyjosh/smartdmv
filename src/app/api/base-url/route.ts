import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:9002'
  });
}
