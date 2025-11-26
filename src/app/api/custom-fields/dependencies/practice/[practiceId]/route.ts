import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { practiceId: string } }) {
  try {
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
  }
}