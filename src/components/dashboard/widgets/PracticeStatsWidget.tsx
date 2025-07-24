import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';

interface PracticeStatsWidgetProps {
  widget: WidgetConfig;
}

// Mock practice statistics data - replace with real API call
const mockPracticeStats = {
  todayRevenue: 4250,
  monthlyRevenue: 87500,
  appointmentsToday: 23,
  appointmentsThisWeek: 147,
  averageWaitTime: 18,
  patientSatisfaction: 4.8,
  staffUtilization: 89,
  revenueGrowth: '+15.2%'
};

export const PracticeStatsWidget: React.FC<PracticeStatsWidgetProps> = ({ widget }) => {
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
            ${mockPracticeStats.todayRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-green-700">Today's Revenue</p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">{mockPracticeStats.revenueGrowth}</span>
          </div>
          <p className="text-xl font-bold text-blue-900 mt-1">
            ${mockPracticeStats.monthlyRevenue.toLocaleString()}
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
          <p className="text-lg font-bold mt-1">{mockPracticeStats.appointmentsToday}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
        
        <div className="p-3 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">This Week</span>
          </div>
          <p className="text-lg font-bold mt-1">{mockPracticeStats.appointmentsThisWeek}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Average Wait Time</span>
          <span className="font-medium">{mockPracticeStats.averageWaitTime} min</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Patient Satisfaction</span>
          <div className="flex items-center space-x-1">
            <span className="font-medium">{mockPracticeStats.patientSatisfaction}</span>
            <span className="text-yellow-500">★</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Staff Utilization</span>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${mockPracticeStats.staffUtilization}%` }}
              ></div>
            </div>
            <span className="font-medium w-8 text-right">{mockPracticeStats.staffUtilization}%</span>
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
