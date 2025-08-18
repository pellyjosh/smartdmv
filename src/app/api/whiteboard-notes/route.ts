// src/app/api/whiteboard-notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { whiteboardNotes, users } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { db } from '@/db/index';
import { z } from 'zod';

const createNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const notes = await (db as any)
      .select({
        id: whiteboardNotes.id,
        note: whiteboardNotes.note,
        date: whiteboardNotes.date,
        createdAt: whiteboardNotes.createdAt,
        updatedAt: whiteboardNotes.updatedAt,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(whiteboardNotes)
      .leftJoin(users, eq(whiteboardNotes.authorId, users.id))
      .where(
        and(
          eq(whiteboardNotes.date, date),
          eq(whiteboardNotes.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .orderBy(desc(whiteboardNotes.createdAt));

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching whiteboard notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whiteboard notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createNoteSchema.parse(body);

    const [newNote] = await (db as any)
      .insert(whiteboardNotes)
      .values({
        note: validatedData.note,
        date: validatedData.date,
        practiceId: parseInt(userPractice.practiceId),
        authorId: parseInt(userPractice.userId),
      })
      .returning();

    // Fetch the complete note with author info
    const [noteWithAuthor] = await (db as any)
      .select({
        id: whiteboardNotes.id,
        note: whiteboardNotes.note,
        date: whiteboardNotes.date,
        createdAt: whiteboardNotes.createdAt,
        updatedAt: whiteboardNotes.updatedAt,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(whiteboardNotes)
      .leftJoin(users, eq(whiteboardNotes.authorId, users.id))
      .where(eq(whiteboardNotes.id, newNote.id));

    return NextResponse.json(noteWithAuthor, { status: 201 });
  } catch (error) {
    console.error('Error creating whiteboard note:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create whiteboard note' },
      { status: 500 }
    );
  }
}
