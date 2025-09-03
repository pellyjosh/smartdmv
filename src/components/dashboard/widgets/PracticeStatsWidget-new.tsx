import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';
import { useQuery } from '@tanstack/react-query';

interface PracticeStatsWidgetProps {
  widget: WidgetConfig;
}

interface PracticeStats {
  todayRevenue: number;
  monthlyRevenue: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  averageWaitTime: number;
  patientSatisfaction: number;
  staffUtilization: number;
  revenueGrowth: string;
}

export const PracticeStatsWidget: React.FC<PracticeStatsWidgetProps> = ({ widget }) => {
  // Fetch practice statistics from API
  const { data: practiceStats } = useQuery<PracticeStats>({
    queryKey: ['practice-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/practice');
      if (!response.ok) {
        // Return default values if API fails
        return {
          todayRevenue: 0,
          monthlyRevenue: 0,
          appointmentsToday: 0,
          appointmentsThisWeek: 0,
          averageWaitTime: 0,
          patientSatisfaction: 0,
          staffUtilization: 0,
          revenueGrowth: 'No data'
        };
      }
      return response.json();
    },
    // Fallback data
    placeholderData: {
      todayRevenue: 0,
      monthlyRevenue: 0,
      appointmentsToday: 0,
      appointmentsThisWeek: 0,
      averageWaitTime: 0,
      patientSatisfaction: 0,
      staffUtilization: 0,
      revenueGrowth: 'Loading...'
    }
  });

  return (
    <div className="space-y-4">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <DollarSign className="h-5 w-5 text-green-600" />
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Today</p>
          <p className="text-lg font-bold text-green-900">
            ${practiceStats?.todayRevenue?.toLocaleString() || '0'}
          </p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-blue-600 font-medium">{practiceStats?.revenueGrowth || 'No data'}</span>
          </div>
          <p className="text-xs text-muted-foreground">Monthly: 
            ${practiceStats?.monthlyRevenue?.toLocaleString() || '0'}
          </p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <BarChart3 className="h-5 w-5 text-blue-600 mb-1" />
          <p className="text-xs text-muted-foreground">Performance</p>
          <p className="text-sm font-medium">Above Average</p>
          <p className="text-xs text-green-600 font-medium">+8% efficiency</p>
        </div>
      </div>

      {/* Appointment Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Calendar className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-lg font-bold mt-1">{practiceStats?.appointmentsToday || 0}</p>
          <p className="text-xs text-muted-foreground">appointments</p>
        </div>
        
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="text-lg font-bold mt-1">{practiceStats?.appointmentsThisWeek || 0}</p>
          <p className="text-xs text-muted-foreground">appointments</p>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-sm">Avg. Wait Time</span>
          <span className="font-medium">{practiceStats?.averageWaitTime || 0} min</span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-sm">Patient Satisfaction</span>
          <div className="flex items-center">
            <span className="font-medium">{practiceStats?.patientSatisfaction || 0}/5.0</span>
          </div>
        </div>
        
        <div className="p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">Staff Utilization</span>
            <span className="font-medium w-8 text-right">{practiceStats?.staffUtilization || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${practiceStats?.staffUtilization || 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
