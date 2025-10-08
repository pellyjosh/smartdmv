import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { managerAssignments } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const url = new URL(req.url);
    const managerId = url.searchParams.get('managerId');
    const employeeId = url.searchParams.get('employeeId');

    const tenantDb = await getCurrentTenantDb();
    
    let clauses = [eq(managerAssignments.practiceId, practiceId), eq(managerAssignments.isActive, true)];
    
    if (managerId) {
      clauses.push(eq(managerAssignments.managerId, Number(managerId)));
    }
    
    if (employeeId) {
      clauses.push(eq(managerAssignments.employeeId, Number(employeeId)));
    }
    
    const where = and(...clauses);

    const assignments = await tenantDb.select({
      id: managerAssignments.id,
      managerId: managerAssignments.managerId,
      employeeId: managerAssignments.employeeId,
      assignmentType: managerAssignments.assignmentType,
      canApproveTimeOff: managerAssignments.canApproveTimeOff,
      canApproveHours: managerAssignments.canApproveHours,
      canApprovePayroll: managerAssignments.canApprovePayroll,
      canApproveRates: managerAssignments.canApproveRates,
      startDate: managerAssignments.startDate,
      endDate: managerAssignments.endDate,
      isActive: managerAssignments.isActive,
      createdAt: managerAssignments.createdAt,
      managerName: users.name,
      managerEmail: users.email
    })
    .from(managerAssignments)
    .leftJoin(users, eq(users.id, managerAssignments.managerId))
    .where(where)
    .orderBy(desc(managerAssignments.createdAt));

    // Get employee names
    const enhancedAssignments = await Promise.all(
      assignments.map(async (assignment: any) => {
        const [employee] = await tenantDb.select({
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, assignment.employeeId));
        
        return {
          ...assignment,
          employeeName: employee?.name || 'Unknown',
          employeeEmail: employee?.email || null
        };
      })
    );
    
    return NextResponse.json(enhancedAssignments);
  } catch (e) {
    console.error('List manager assignments error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      managerId, 
      employeeId, 
      assignmentType, 
      canApproveTimeOff, 
      canApproveHours, 
      canApprovePayroll, 
      canApproveRates,
      startDate,
      endDate
    } = body;
    
    if (!managerId || !employeeId || !assignmentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Check if assignment already exists
    const [existing] = await tenantDb.select()
      .from(managerAssignments)
      .where(and(
        eq(managerAssignments.practiceId, practiceId),
        eq(managerAssignments.managerId, Number(managerId)),
        eq(managerAssignments.employeeId, Number(employeeId)),
        eq(managerAssignments.isActive, true)
      ));

    if (existing) {
      return NextResponse.json({ error: 'Manager assignment already exists' }, { status: 400 });
    }
    
    const [assignment] = await tenantDb.insert(managerAssignments).values({
      practiceId,
      managerId: Number(managerId),
      employeeId: Number(employeeId),
      assignmentType,
      canApproveTimeOff: canApproveTimeOff || true,
      canApproveHours: canApproveHours || true,
      canApprovePayroll: canApprovePayroll || false,
      canApproveRates: canApproveRates || false,
      startDate: new Date(startDate || new Date()),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true
    }).returning();
    
    return NextResponse.json(assignment);
  } catch (e) {
    console.error('Create manager assignment error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}