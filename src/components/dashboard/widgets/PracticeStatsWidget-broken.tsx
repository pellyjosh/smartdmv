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
          <p className="text-xl font-bold text-green-900 mt-1">
            ${practiceStats?.todayRevenue.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-green-700">Today's Revenue</p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">{practiceStats?.revenueGrowth}</span>
          </div>
          <p className="text-xl font-bold text-blue-900 mt-1">
            ${practiceStats?.monthlyRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-blue-700">Monthly Revenue</p>
        </div>
      </div>

      {/* Appointment Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Today</span>
          </div>
          <p className="text-lg font-bold mt-1">{practiceStats?.appointmentsToday}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
        
        <div className="p-3 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">This Week</span>
          </div>
          <p className="text-lg font-bold mt-1">{practiceStats?.appointmentsThisWeek}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Average Wait Time</span>
          <span className="font-medium">{practiceStats?.averageWaitTime} min</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Patient Satisfaction</span>
          <div className="flex items-center space-x-1">
            <span className="font-medium">{practiceStats?.patientSatisfaction}</span>
            <span className="text-yellow-500">★</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Staff Utilization</span>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${practiceStats?.staffUtilization}%` }}
              ></div>
            </div>
            <span className="font-medium w-8 text-right">{practiceStats?.staffUtilization}%</span>
          </div>
        </div>
      </div>

      {/* Performance indicator */}
      <div className="text-center pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Performance: <span className="text-green-600 font-medium">Excellent</span>
        </p>
      </div>
    </div>
  );
};
