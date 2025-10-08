import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { approvalWorkflows, approvalWorkflowSteps } from '@/db/schemas/financeSchema';

// Script to seed default approval workflows for payroll
async function seedDefaultApprovalWorkflows(practiceId: number) {
  const tenantDb = await getCurrentTenantDb();

  const defaultWorkflows = [
    {
      name: 'Time Approval Workflow',
      workflowType: 'time_approval' as const,
      description: 'Default workflow for approving employee work hours',
      autoApprove: false,
      approvalLevels: 1,
      workflowConfig: JSON.stringify({
        autoApproveThreshold: 8, // Auto-approve if <= 8 hours
        requireManagerApproval: true,
        escalationDays: 3
      }),
      steps: [
        {
          stepName: 'Manager Approval',
          approverType: 'manager',
          requiresAll: false,
          isOptional: false
        }
      ]
    },
    {
      name: 'Payroll Approval Workflow',
      workflowType: 'payroll_approval' as const,
      description: 'Default workflow for approving payroll processing',
      autoApprove: false,
      approvalLevels: 2,
      workflowConfig: JSON.stringify({
        requireHRApproval: true,
        requireFinanceApproval: true,
        escalationDays: 2
      }),
      steps: [
        {
          stepName: 'HR Review',
          approverType: 'role',
          requiresAll: false,
          isOptional: false
        },
        {
          stepName: 'Finance Approval',
          approverType: 'role',
          requiresAll: true,
          isOptional: false
        }
      ]
    },
    {
      name: 'Pay Rate Change Approval',
      workflowType: 'rate_approval' as const,
      description: 'Workflow for approving employee pay rate changes',
      autoApprove: false,
      approvalLevels: 2,
      workflowConfig: JSON.stringify({
        autoApproveThreshold: 0, // Never auto-approve rate changes
        requireManagerApproval: true,
        requireHRApproval: true,
        escalationDays: 5
      }),
      steps: [
        {
          stepName: 'Manager Review',
          approverType: 'manager',
          requiresAll: false,
          isOptional: false
        },
        {
          stepName: 'HR Approval',
          approverType: 'role',
          requiresAll: true,
          isOptional: false
        }
      ]
    },
    {
      name: 'Deduction Change Approval',
      workflowType: 'deduction_approval' as const,
      description: 'Workflow for approving employee deduction changes',
      autoApprove: false,
      approvalLevels: 1,
      workflowConfig: JSON.stringify({
        autoApproveVoluntary: true, // Auto-approve voluntary deductions
        requireHRApproval: true,
        escalationDays: 3
      }),
      steps: [
        {
          stepName: 'HR Review',
          approverType: 'role',
          requiresAll: false,
          isOptional: false
        }
      ]
    }
  ];

  try {
    const createdWorkflows = [];

    for (const workflowData of defaultWorkflows) {
      const { steps, ...workflowFields } = workflowData;
      
      // Create workflow
      const [workflow] = await tenantDb.insert(approvalWorkflows).values({
        practiceId,
        ...workflowFields,
        isActive: true
      }).returning();

      // Create workflow steps
      if (steps && Array.isArray(steps)) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await tenantDb.insert(approvalWorkflowSteps).values({
            workflowId: workflow.id,
            stepOrder: i + 1,
            stepName: step.stepName,
            approverType: step.approverType,
            approverIds: null, // Will be configured later
            requiresAll: step.requiresAll,
            isOptional: step.isOptional,
            autoApproveConditions: null
          });
        }
      }

      createdWorkflows.push(workflow);
    }
    
    console.log(`Successfully seeded ${createdWorkflows.length} default approval workflows for practice ${practiceId}`);
    return { success: true, count: createdWorkflows.length, workflows: createdWorkflows };
  } catch (error) {
    console.error('Error seeding approval workflows:', error);
    throw error;
  }
}

export { seedDefaultApprovalWorkflows };