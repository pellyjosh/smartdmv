import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, ...body }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log audit event' }, { status: 500 });
  }
}