import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ error: 'Dependencies storage not configured' }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update dependency' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete dependency' }, { status: 500 });
  }
}