// src/app/api/owner/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/db/owner-db.config';
import { ownerSessions } from '@/db/owner-schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('owner_session')?.value;

    if (sessionId) {
      // Delete session from database
      await ownerDb
        .delete(ownerSessions)
        .where(eq(ownerSessions.id, sessionId));
    }

    // Create response
    const response = NextResponse.json({
      message: 'Logout successful',
    });

    // Clear cookie
    response.cookies.set('owner_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Owner logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
