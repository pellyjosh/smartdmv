import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { referrals, ReferralStatus, ReferralPriority, VetSpecialty } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';

// Create referral schema for validation
const createReferralSchema = z.object({
  petId: z.string(),
  referringVetId: z.string(),
  specialistId: z.string().optional(),
  specialistPracticeId: z.string().optional(),
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
    const [newReferral] = await db.insert(referrals).values({
      petId: validatedData.petId,
      referringPracticeId: userPractice.practiceId,
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
      where: eq(referrals.referringPracticeId, userPractice.practiceId),
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
