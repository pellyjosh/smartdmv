import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { referrals, ReferralStatus, ReferralPriority, VetSpecialty } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';

// Create referral schema for validation
const createReferralSchema = z.object({
  petId: z.union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        if (val.trim() === '') {
          throw new Error('Pet ID cannot be empty');
        }
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Pet ID must be a valid number');
        }
        return parsed;
      }
      return val;
    }),
  referringVetId: z.union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        if (val.trim() === '') {
          throw new Error('Referring Vet ID cannot be empty');
        }
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Referring Vet ID must be a valid number');
        }
        return parsed;
      }
      return val;
    }),
  specialistId: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') {
        return undefined;
      }
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Specialist ID must be a valid number');
        }
        return parsed;
      }
      return val;
    })
    .optional(),
  specialistPracticeId: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') {
        return undefined;
      }
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Specialist Practice ID must be a valid number');
        }
        return parsed;
      }
      return val;
    })
    .optional(),
  referralReason: z.string().min(3, "Please provide a reason for the referral"),
  specialty: z.enum(Object.values(VetSpecialty) as [string, ...string[]]),
  clinicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  diagnosticTests: z.string().optional(),
  referralNotes: z.string().optional(),
  priority: z.enum(Object.values(ReferralPriority) as [string, ...string[]]).default(ReferralPriority.ROUTINE),
  scheduledDate: z.string().optional(),
  createAppointment: z.boolean().default(false),
});

// POST /api/referrals - Create new referral
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createReferralSchema.parse(body);

    // Create the referral
    const [newReferral] = await (db as any).insert(referrals).values({
      petId: validatedData.petId,
      referringPracticeId: parseInt(userPractice.practiceId.toString(), 10),
      referringVetId: validatedData.referringVetId,
      specialistId: validatedData.specialistId,
      specialistPracticeId: validatedData.specialistPracticeId,
      referralReason: validatedData.referralReason,
      specialty: validatedData.specialty,
      clinicalHistory: validatedData.clinicalHistory,
      currentMedications: validatedData.currentMedications,
      diagnosticTests: validatedData.diagnosticTests,
      referralNotes: validatedData.referralNotes,
      priority: validatedData.priority,
      status: ReferralStatus.DRAFT,
      scheduledDate: validatedData.scheduledDate,
      createAppointment: validatedData.createAppointment,
    }).returning();

    return NextResponse.json(newReferral, { status: 201 });
  } catch (error) {
    console.error('Error creating referral:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create referral' },
      { status: 500 }
    );
  }
}

// GET /api/referrals - Get all referrals for practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const practiceReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referringPracticeId, parseInt(userPractice.practiceId.toString(), 10)),
      with: {
        pet: true,
        referringVet: true,
        specialist: true,
        specialistPractice: true,
      },
      orderBy: (referrals, { desc }) => [desc(referrals.createdAt)],
    });

    return NextResponse.json(practiceReferrals);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}
