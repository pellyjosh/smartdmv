import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, BarChart, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface LabResultParameter {
  name: string;
  value: number | string;
  units: string;
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };
  status: 'normal' | 'abnormal' | 'critical';
  previousValue?: number;
  trendDirection?: 'up' | 'down' | 'stable';
}

interface LabResult {
  id: number;
  labOrderId: number;
  testCatalogId: number;
  testName: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending' | 'inconclusive';
  resultDate: string;
  parameters: LabResultParameter[];
  notes?: string;
  referenceRange?: any;
  createdAt: string;
}

interface LabResultsVisualizationProps {
  labResults: LabResult[];
  isLoading?: boolean;
  petId: number;
  testCatalogId?: number;
}

export const LabResultsVisualization: React.FC<LabResultsVisualizationProps> = ({
  labResults,
  isLoading = false,
  petId,
  testCatalogId
}) => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<string>('1y');
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [visualizationType, setVisualizationType] = useState<'chart' | 'table'>('chart');

  // Filter results by the selected test type
  const filteredResults = useMemo(() => {
    if (isLoading || !labResults) return [];
    
    let filtered = [...labResults];
    
    // Filter by test catalog ID if provided
    if (testCatalogId) {
      filtered = filtered.filter(result => result.testCatalogId === testCatalogId);
    }
    
    // Apply time range filter
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timeRange) {
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        cutoffDate = new Date(0); // Beginning of time
        break;
    }
    
    filtered = filtered.filter(result => 
      new Date(result.resultDate) >= cutoffDate
    );
    
    // Sort by date (oldest first for charts)
    return filtered.sort((a, b) => 
      new Date(a.resultDate).getTime() - new Date(b.resultDate).getTime()
    );
  }, [labResults, testCatalogId, timeRange, isLoading]);

  // Extract all unique parameter names from the results
  const parameterNames = useMemo(() => {
    if (!filteredResults.length) return [];
    
    const names = new Set<string>();
    
    filteredResults.forEach(result => {
      if (result.parameters) {
        result.parameters.forEach(param => {
          names.add(param.name);
        });
      }
    });
    
    return Array.from(names);
  }, [filteredResults]);

  // Set the initial selected parameter
  React.useEffect(() => {
    if (parameterNames.length && !selectedParameter) {
      setSelectedParameter(parameterNames[0]);
    }
  }, [parameterNames, selectedParameter]);

  // Prepare chart data for the selected parameter
  const chartData = useMemo(() => {
    if (!selectedParameter || !filteredResults.length) return [];
    
    return filteredResults.map(result => {
      const date = new Date(result.resultDate);
      const param = result.parameters?.find(p => p.name === selectedParameter);
      
      return {
        date: format(date, 'MMM d, yyyy'),
        timestamp: date.getTime(),
        value: param ? 
          (typeof param.value === 'number' ? param.value : parseFloat(param.value as string) || 0) 
          : null,
        units: param?.units || '',
        status: param?.status || 'normal',
        resultId: result.id,
        referenceRange: param?.referenceRange || result.referenceRange,
      };
    }).filter(item => item.value !== null);
  }, [selectedParameter, filteredResults]);

  // Extract reference range for the selected parameter
  const referenceRange = useMemo(() => {
    if (!chartData.length) return null;
    
    // Find the most recent test with reference range data
    for (let i = chartData.length - 1; i >= 0; i--) {
      const data = chartData[i];
      if (data.referenceRange) {
        return {
          low: data.referenceRange.low,
          high: data.referenceRange.high,
          text: data.referenceRange.text
        };
      }
    }
    
    return null;
  }, [chartData]);

  // Calculate trend information
  const trendInfo = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const firstValue = chartData[0]?.value ?? 0;
    const lastValue = chartData[chartData.length - 1]?.value ?? 0;
    
    // If either value is missing or zero, don't show a trend
    if (firstValue === 0 || lastValue === 0) return null;
    
    const changeAmount = lastValue - firstValue;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 1) direction = 'up';
    else if (changePercent < -1) direction = 'down';
    
    const isOutOfRange = referenceRange && (
      (referenceRange.low !== undefined && lastValue < referenceRange.low) || 
      (referenceRange.high !== undefined && lastValue > referenceRange.high)
    );
    
    return {
      changeAmount,
      changePercent,
      direction,
      isOutOfRange: !!isOutOfRange
    };
  }, [chartData, referenceRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-36" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-24" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!filteredResults.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Results Available</CardTitle>
          <CardDescription>
            There are no lab results matching the selected criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          No data is available for visualization. Please try a different test or time range.
        </CardContent>
      </Card>
    );
  }

  const latestTestName = filteredResults[filteredResults.length - 1]?.testName || 'Lab Test';

  return (
    <Card className="mt-4">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              {latestTestName} {trendInfo && (
                <Badge variant={trendInfo.isOutOfRange ? "destructive" : "secondary"}>
                  {trendInfo.direction === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {trendInfo.direction === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                  {trendInfo.changePercent.toFixed(1)}%
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {chartData.length} results over time
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={selectedParameter || undefined} 
              onValueChange={setSelectedParameter}
              disabled={parameterNames.length === 0}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Parameter" />
              </SelectTrigger>
              <SelectContent>
                {parameterNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex">
              <Button 
                variant={visualizationType === 'chart' ? "default" : "outline"} 
                size="icon"
                onClick={() => setVisualizationType('chart')}
                className="rounded-r-none"
              >
                <BarChart className="h-4 w-4" />
              </Button>
              <Button 
                variant={visualizationType === 'table' ? "default" : "outline"} 
                size="icon"
                onClick={() => setVisualizationType('table')}
                className="rounded-l-none"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visualizationType === 'chart' ? (
          // Chart View
          <>
            <div className="relative h-[250px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    label={{ 
                      value: chartData[0]?.units || '', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#888' }
                    }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value} ${chartData[0]?.units || ''}`, selectedParameter || 'Value']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={selectedParameter || 'Value'}
                    stroke="#8884d8"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    dot={{ r: 4 }}
                  />
                  
                  {/* Reference range lines */}
                  {referenceRange?.low !== undefined && (
                    <ReferenceLine
                      y={referenceRange.low}
                      stroke="#ff9800"
                      strokeDasharray="3 3"
                      label={{ value: `Min: ${referenceRange.low}`, position: 'right', fill: '#ff9800' }}
                    />
                  )}
                  {referenceRange?.high !== undefined && (
                    <ReferenceLine
                      y={referenceRange.high}
                      stroke="#ff9800"
                      strokeDasharray="3 3"
                      label={{ value: `Max: ${referenceRange.high}`, position: 'right', fill: '#ff9800' }}
                    />
                  )}
                  
                  {/* Create reference area for normal range */}
                  {referenceRange?.low !== undefined && referenceRange?.high !== undefined && (
                    <ReferenceArea
                      y1={referenceRange.low}
                      y2={referenceRange.high}
                      fill="#73C1781A"
                      fillOpacity={0.2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Reference range info */}
            {referenceRange && (
              <div className="mt-4 p-2 border rounded-md bg-muted/50 text-sm">
                <div className="font-medium">Reference Range:</div>
                {referenceRange.text ? (
                  <div>{referenceRange.text}</div>
                ) : (
                  <div>
                    {referenceRange.low !== undefined && referenceRange.high !== undefined
                      ? `${referenceRange.low} - ${referenceRange.high} ${chartData[0]?.units || ''}`
                      : referenceRange.low !== undefined
                      ? `> ${referenceRange.low} ${chartData[0]?.units || ''}`
                      : referenceRange.high !== undefined
                      ? `< ${referenceRange.high} ${chartData[0]?.units || ''}`
                      : 'No reference range available'
                    }
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Table View
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left">Date</th>
                  <th className="py-2 px-3 text-left">Value</th>
                  <th className="py-2 px-3 text-left">Status</th>
                  <th className="py-2 px-3 text-left">Trend</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice().reverse().map((item, index) => (
                  <tr 
                    key={item.resultId} 
                    className={`border-b ${
                      item.status === 'critical' ? 'bg-red-50' :
                      item.status === 'abnormal' ? 'bg-amber-50' : ''
                    }`}
                  >
                    <td className="py-2 px-3">{item.date}</td>
                    <td className="py-2 px-3 font-medium">{item.value} {item.units}</td>
                    <td className="py-2 px-3">
                      <Badge variant={
                        item.status === 'critical' ? 'destructive' :
                        item.status === 'abnormal' ? 'outline' : 'secondary'
                      }>
                        {item.status === 'critical' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      {index < chartData.length - 1 && (
                        <>
                          {(() => {
                            const currentValue = item.value || 0;
                            const prevValue = chartData.slice().reverse()[index + 1]?.value || 0;
                            
                            // If either value is missing or zero, don't show a trend
                            if (currentValue === 0 || prevValue === 0) {
                              return <span className="text-gray-400">No data</span>;
                            }
                            
                            // Calculate percent change
                            const percentChange = ((currentValue - prevValue) / prevValue * 100);
                            
                            if (percentChange > 0) {
                              return (
                                <span className="flex items-center text-emerald-600">
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  {percentChange.toFixed(1)}%
                                </span>
                              );
                            } else if (percentChange < 0) {
                              return (
                                <span className="flex items-center text-red-600">
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  {Math.abs(percentChange).toFixed(1)}%
                                </span>
                              );
                            } else {
                              return <span className="text-gray-400">No change</span>;
                            }
                          })()}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};