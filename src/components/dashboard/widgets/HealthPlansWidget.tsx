import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HeartPulse, Calendar, User } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';

interface HealthPlansWidgetProps {
  widget: WidgetConfig;
}

// Mock health plan data - replace with real API call
const mockHealthPlans = [
  {
    id: 1,
    petName: 'Buddy',
    ownerName: 'John Smith',
    planName: 'Senior Wellness Plan',
    progress: 75,
    nextDue: 'Dental Cleaning',
    dueDate: '2025-08-15',
    status: 'active'
  },
  {
    id: 2,
    petName: 'Luna',
    ownerName: 'Sarah Johnson',
    planName: 'Puppy Health Plan',
    progress: 60,
    nextDue: 'Final Vaccination',
    dueDate: '2025-07-25',
    status: 'active'
  },
  {
    id: 3,
    petName: 'Max',
    ownerName: 'Mike Davis',
    planName: 'Basic Wellness',
    progress: 90,
    nextDue: 'Annual Checkup',
    dueDate: '2025-08-01',
    status: 'due'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'due':
      return 'destructive';
    case 'overdue':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const HealthPlansWidget: React.FC<HealthPlansWidgetProps> = ({ widget }) => {
  return (
    <div className="space-y-3">
      {mockHealthPlans.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <HeartPulse className="mx-auto h-8 w-8 mb-2" />
          <p>No active health plans</p>
        </div>
      ) : (
        mockHealthPlans.map((plan) => (
          <div key={plan.id} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{plan.petName}</p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {plan.ownerName}
                </p>
              </div>
              <Badge variant={getStatusColor(plan.status)}>
                {plan.status}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium">{plan.planName}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Progress</span>
                <span>{plan.progress}%</span>
              </div>
              <Progress value={plan.progress} className="h-2 mt-1" />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Next:</span>
              <span className="font-medium">{plan.nextDue}</span>
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              Due: {new Date(plan.dueDate).toLocaleDateString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
