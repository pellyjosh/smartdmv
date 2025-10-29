// src/app/api/owner/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/db/owner-db.config';
import { ownerUsers, ownerSessions } from '@/owner/db/schemas/ownerSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const [user] = await ownerDb
      .select()
      .from(ownerUsers)
      .where(eq(ownerUsers.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await ownerDb
      .insert(ownerSessions)
      .values({
        id: sessionId,
        userId: user.id,
        expiresAt: expiresAt,
      });

    // Create response
    const response = NextResponse.json({
      message: 'Login successful',
      token: sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('owner_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Owner login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
