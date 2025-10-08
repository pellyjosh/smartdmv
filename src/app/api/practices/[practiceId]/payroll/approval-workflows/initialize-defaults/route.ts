import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { seedDefaultApprovalWorkflows } from '@/scripts/seed-default-workflows';

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await seedDefaultApprovalWorkflows(practiceId);
    
    return NextResponse.json({ 
      message: `Successfully initialized ${result.count} default approval workflows`,
      ...result 
    });
  } catch (e) {
    console.error('Initialize default workflows error', e);
    return NextResponse.json({ error: 'Failed to initialize default workflows' }, { status: 500 });
  }
}