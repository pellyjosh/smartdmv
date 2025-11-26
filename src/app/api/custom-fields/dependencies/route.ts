import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    return NextResponse.json({ error: 'Dependencies storage not configured' }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dependency' }, { status: 500 });
  }
}