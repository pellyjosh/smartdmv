import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { approvalWorkflows, approvalWorkflowSteps } from '@/db/schemas/financeSchema';
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
    const workflowType = url.searchParams.get('type');

    const tenantDb = await getCurrentTenantDb();
    
    const clauses = [eq(approvalWorkflows.practiceId, practiceId)];
    if (workflowType) {
      clauses.push(eq(approvalWorkflows.workflowType, workflowType as any));
    }
    const where = and(...clauses);

    const workflows = await tenantDb.select()
      .from(approvalWorkflows)
      .where(where)
      .orderBy(desc(approvalWorkflows.createdAt));
    
    // Get workflow steps for each workflow
    const workflowsWithSteps = await Promise.all(
      workflows.map(async (workflow: any) => {
        const steps = await tenantDb.select()
          .from(approvalWorkflowSteps)
          .where(eq(approvalWorkflowSteps.workflowId, workflow.id))
          .orderBy(approvalWorkflowSteps.stepOrder);
        
        return {
          ...workflow,
          steps,
          stepCount: steps.length
        };
      })
    );
    
    return NextResponse.json(workflowsWithSteps);
  } catch (e) {
    console.error('List approval workflows error', e);
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
    const { name, workflowType, description, autoApprove, approvalLevels, workflowConfig, steps } = body;
    
    if (!name || !workflowType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Create workflow
    const [workflow] = await tenantDb.insert(approvalWorkflows).values({
      practiceId,
      name,
      workflowType,
      description: description || null,
      autoApprove: autoApprove || false,
      approvalLevels: approvalLevels || 1,
      workflowConfig: workflowConfig ? JSON.stringify(workflowConfig) : null,
      isActive: true
    }).returning();
    
    // Create workflow steps if provided
    if (steps && Array.isArray(steps)) {
      const stepPromises = steps.map((step: any, index: number) =>
        tenantDb.insert(approvalWorkflowSteps).values({
          workflowId: workflow.id,
          stepOrder: index + 1,
          stepName: step.stepName,
          approverType: step.approverType,
          approverIds: step.approverIds ? JSON.stringify(step.approverIds) : null,
          requiresAll: step.requiresAll || false,
          autoApproveConditions: step.autoApproveConditions ? JSON.stringify(step.autoApproveConditions) : null,
          isOptional: step.isOptional || false
        }).returning()
      );
      
      await Promise.all(stepPromises);
    }
    
    return NextResponse.json(workflow);
  } catch (e) {
    console.error('Create approval workflow error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}