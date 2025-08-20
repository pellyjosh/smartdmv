import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { electronicSignatures } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const createSignatureSchema = z.object({
  userId: z.number(),
  signerName: z.string(),
  signerEmail: z.string().email().optional().or(z.literal('').transform(() => '')),
  signerType: z.string(),
  signatureData: z.string(),
  documentType: z.string(),
  documentId: z.number(),
  practiceId: z.number(),
  documentName: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceInfo: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  const userIdParam = request.nextUrl.searchParams.get('userId');
  const practiceIdParam = request.nextUrl.searchParams.get('practiceId');

  try {
    if (userIdParam) {
      const userId = parseInt(userIdParam, 10);
      const rows = await db.select().from(electronicSignatures)
        .where(eq(electronicSignatures.userId, String(userId)))
        .orderBy(desc(electronicSignatures.createdAt));
      const mapped = rows.map((r: any) => ({
        ...r,
        // Parse JSON stored as text
        metadata: typeof r.metadata === 'string' ? (() => { try { return JSON.parse(r.metadata); } catch { return {}; } })() : r.metadata,
      }));
      return NextResponse.json(mapped, { status: 200 });
    }

    if (practiceIdParam) {
      const rows = await db.select().from(electronicSignatures)
        .where(eq(electronicSignatures.practiceId, String(practiceIdParam)))
        .orderBy(desc(electronicSignatures.createdAt));
      const mapped = rows.map((r: any) => ({
        ...r,
        metadata: typeof r.metadata === 'string' ? (() => { try { return JSON.parse(r.metadata); } catch { return {}; } })() : r.metadata,
      }));
      return NextResponse.json(mapped, { status: 200 });
    }

    return NextResponse.json({ error: 'Missing userId or practiceId' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching signatures:', error);
    return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSignatureSchema.parse(body);

    const insertData = {
      userId: String(parsed.userId),
      signerName: parsed.signerName,
      signerEmail: parsed.signerEmail || '',
      signerType: parsed.signerType,
      signatureData: parsed.signatureData,
      documentType: parsed.documentType,
      documentId: String(parsed.documentId),
      practiceId: String(parsed.practiceId),
      documentName: parsed.documentName,
      ipAddress: parsed.ipAddress || null,
      userAgent: parsed.userAgent || null,
      deviceInfo: parsed.deviceInfo || null,
      metadata: parsed.metadata ? JSON.stringify(parsed.metadata) : '{}',
      verified: false,
    } as any;

    const [inserted] = await db.insert(electronicSignatures).values(insertData).returning();
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('Error creating signature:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 });
  }
}
