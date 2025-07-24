import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Test provider submission received:', body);
    
    // Return success with the data for testing
    return NextResponse.json({
      success: true,
      message: 'Provider data received successfully',
      data: body
    }, { status: 201 });
  } catch (error) {
    console.error('Error in test provider endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
