import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect /auth to /auth/login
  return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'));
}
