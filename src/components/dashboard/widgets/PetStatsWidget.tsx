import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, Stethoscope, Heart, Users } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';

interface PetStatsWidgetProps {
  widget: WidgetConfig;
}

// Mock pet statistics data - replace with real API call
const mockPetStats = {
  totalPets: 1247,
  activePets: 892,
  checkinsToday: 23,
  speciesBreakdown: [
    { name: 'Dogs', count: 634, percentage: 51 },
    { name: 'Cats', count: 445, percentage: 36 },
    { name: 'Birds', count: 89, percentage: 7 },
    { name: 'Other', count: 79, percentage: 6 }
  ],
  recentGrowth: '+12% this month'
};

export const PetStatsWidget: React.FC<PetStatsWidgetProps> = ({ widget }) => {
  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <PawPrint className="h-5 w-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">+5.2%</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{mockPetStats.totalPets.toLocaleString()}</p>
          <p className="text-xs text-blue-700">Total Patients</p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Heart className="h-5 w-5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{mockPetStats.activePets.toLocaleString()}</p>
          <p className="text-xs text-green-700">Active Patients</p>
        </div>
      </div>

      {/* Today's Check-ins */}
      <div className="p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-4 w-4 text-orange-600" />
            <span className="font-medium">Today's Check-ins</span>
          </div>
          <span className="text-lg font-bold text-orange-600">{mockPetStats.checkinsToday}</span>
        </div>
      </div>

      {/* Species Breakdown */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm flex items-center">
          <Users className="h-4 w-4 mr-1" />
          Species Distribution
        </h4>
        {mockPetStats.speciesBreakdown.map((species) => (
          <div key={species.name} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{species.name}</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${species.percentage}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">{species.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Growth indicator */}
      <div className="text-center pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Growth: <span className="text-green-600 font-medium">{mockPetStats.recentGrowth}</span>
        </p>
      </div>
    </div>
  );
};
