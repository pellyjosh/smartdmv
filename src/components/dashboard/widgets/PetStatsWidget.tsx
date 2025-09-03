import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, Stethoscope, Heart, Users } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';
import { useQuery } from '@tanstack/react-query';

interface PetStatsWidgetProps {
  widget: WidgetConfig;
}

interface PetStats {
  totalPets: number;
  activePets: number;
  checkinsToday: number;
  speciesBreakdown: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  recentGrowth: string;
}

export const PetStatsWidget: React.FC<PetStatsWidgetProps> = ({ widget }) => {
  // Fetch pet statistics from API
  const { data: petStats } = useQuery<PetStats>({
    queryKey: ['pet-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/pets');
      if (!response.ok) {
        // Return default values if API fails
        return {
          totalPets: 0,
          activePets: 0,
          checkinsToday: 0,
          speciesBreakdown: [],
          recentGrowth: 'No data'
        };
      }
      return response.json();
    },
    // Fallback data
    placeholderData: {
      totalPets: 0,
      activePets: 0,
      checkinsToday: 0,
      speciesBreakdown: [],
      recentGrowth: 'Loading...'
    }
  });

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <PawPrint className="h-5 w-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">+5.2%</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{petStats?.totalPets.toLocaleString() || '0'}</p>
          <p className="text-xs text-blue-700">Total Patients</p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Heart className="h-5 w-5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{petStats?.activePets.toLocaleString() || '0'}</p>
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
          <span className="text-lg font-bold text-orange-600">{petStats?.checkinsToday || 0}</span>
        </div>
      </div>

      {/* Species Breakdown */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm flex items-center">
          <Users className="h-4 w-4 mr-1" />
          Species Distribution
        </h4>
        {petStats?.speciesBreakdown.map((species: any) => (
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
          Growth: <span className="text-green-600 font-medium">{petStats?.recentGrowth || 'No data'}</span>
        </p>
      </div>
    </div>
  );
};
