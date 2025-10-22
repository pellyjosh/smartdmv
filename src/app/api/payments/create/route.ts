// src/app/api/payments/create/route.ts
// Simple API endpoint for creating payments

import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/payments/payment-handler';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';

export const runtime = 'nodejs';

/**
 * POST /api/payments/create
 * 
 * Create a payment using the practice's configured provider
 * 
 * Request body:
 * {
 *   practiceId: number;    // Practice ID (or get from session/context)
 *   amount: number;        // Amount in major currency unit (e.g., 50.00 for $50)
 *   email: string;         // Customer email
 *   description?: string;  // Payment description
 *   metadata?: object;     // Additional data (appointmentId, patientName, etc.)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   paymentUrl: string;    // URL to redirect customer for payment
 *   paymentId: string;     // Payment ID from provider
 *   provider: string;      // Provider used ('stripe' or 'paystack')
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { practiceId, amount, email, description, metadata } = body;

    // Validate required fields
    if (!practiceId || !amount || !email) {
      return NextResponse.json(
        { error: 'Practice ID, amount, and email are required' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Verify practice exists in tenant database
    const db = await getCurrentTenantDb();
    const practice = await db.query.practices.findFirst({
      where: (p: any, { eq }: any) => eq(p.id, practiceId),
    });

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    // Create payment using simple handler
    const result = await createPayment({
      practiceId,
      amount,
      email,
      description,
      metadata,
    });

    // Handle errors
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          provider: result.provider,
        },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
      provider: result.provider,
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Payment creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
