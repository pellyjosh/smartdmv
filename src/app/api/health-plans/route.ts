import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/index';
import { healthPlans, pets, practices, healthPlanMilestones } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { isPracticeAdministrator, isVeterinarian, isAdmin } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
  const user = await getCurrentUser(request);
  console.log('[api/health-plans] GET called. currentUser:', user ? { id: user.id, role: (user as any).role } : null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
    const practiceIdParam = url.searchParams.get('practiceId');
  console.log('[api/health-plans] query practiceId param:', practiceIdParam);

  // Admins see everything. Also accept legacy role strings for immediate
  // compatibility where server-side `user` may not yet have a full `roles`
  // array populated for the RBAC helpers.
  const legacyRole = (user as any)?.role;
  if (legacyRole === 'ADMINISTRATOR' || legacyRole === 'SUPER_ADMIN' || isAdmin(user as any)) {
      const plans = await db.query.healthPlans.findMany({
        with: {
          pet: { columns: { id: true, name: true } },
          practice: { columns: { id: true, name: true } }
        },
        orderBy: (h, { desc }) => [desc(h.createdAt)]
      });

      // Attach simple milestone counts so the client can show progress without extra requests
      const plansWithCounts = await Promise.all(plans.map(async (plan) => {
        try {
          const milestones = await db.query.healthPlanMilestones.findMany({ where: eq(healthPlanMilestones.healthPlanId, plan.id) });
          const total = milestones.length;
          const completed = milestones.filter(m => (m as any).completed).length;
          return { ...plan, milestoneCount: total, milestoneCompletedCount: completed };
        } catch (e) {
          return { ...plan, milestoneCount: 0, milestoneCompletedCount: 0 };
        }
      }));

      return NextResponse.json(plansWithCounts, { status: 200 });
    }

    // Practice staff can filter by practice or see plans for their practice
    if (isPracticeAdministrator(user as any) || isVeterinarian(user as any)) {
      const practiceId = practiceIdParam ? Number(practiceIdParam) : (user as any).practiceId;
      if (!practiceId || Number.isNaN(practiceId)) return NextResponse.json({ error: 'Missing or invalid practiceId' }, { status: 400 });

      const plans = await db.query.healthPlans.findMany({
        where: eq(healthPlans.practiceId, practiceId),
        with: {
          pet: { columns: { id: true, name: true } },
          practice: { columns: { id: true, name: true } }
        },
        orderBy: (h, { desc }) => [desc(h.createdAt)]
      });

      return NextResponse.json(plans, { status: 200 });
    }

    // Clients should use /api/health-plans/client route
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (err) {
    console.error('Error fetching health plans', err);
    return NextResponse.json({ error: 'Failed to fetch health plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    console.log('[api/health-plans] POST called. currentUser:', user ? { id: user.id, role: (user as any).role } : null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { name, petId, practiceId, description, planType, startDate, endDate } = body;

    if (!name || !petId || !practiceId) {
      return NextResponse.json({ error: 'Missing required fields: name, petId, practiceId' }, { status: 400 });
    }

    // Only admins or practice admins/vets for the practice can create plans
    const legacyRole = (user as any)?.role;
    const allowedAsAdmin = legacyRole === 'ADMINISTRATOR' || legacyRole === 'SUPER_ADMIN' || isAdmin(user as any);
    const allowedAsPractice = (isPracticeAdministrator(user as any) || isVeterinarian(user as any)) && Number((user as any).practiceId) === Number(practiceId);

    if (!allowedAsAdmin && !allowedAsPractice) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate pet belongs to the practice (basic check)
    const petRecord = await db.query.pets.findFirst({ where: eq(pets.id, Number(petId)) });
    if (!petRecord) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    if (Number(petRecord.practiceId) !== Number(practiceId)) {
      return NextResponse.json({ error: 'Pet does not belong to the specified practice' }, { status: 400 });
    }

    // Insert health plan
    const insertResult = await db.insert(healthPlans).values({
      name,
      petId: Number(petId),
      practiceId: Number(practiceId),
      description: description || null,
      planType: planType || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    }).returning();

    const created = Array.isArray(insertResult) ? insertResult[0] : insertResult;

    // Log the health plan creation
    try {
      await createAuditLog({
        action: 'CREATE',
        recordType: 'HEALTH_PLAN',
        recordId: created.id.toString(),
        description: `Health plan "${name}" created for pet "${petRecord.name}" (ID: ${petId})`,
        userId: user.id.toString(),
        practiceId: practiceId.toString(),
        metadata: {
          healthPlanId: created.id,
          healthPlanName: name,
          petId: Number(petId),
          petName: petRecord.name,
          planType: planType || null,
          startDate: startDate || null,
          endDate: endDate || null
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for health plan creation:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error creating health plan', err);
    return NextResponse.json({ error: 'Failed to create health plan' }, { status: 500 });
  }
}
