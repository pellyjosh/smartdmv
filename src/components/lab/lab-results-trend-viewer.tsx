import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle, InfoIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LabResultsTrendViewerProps {
  petId: number;
  testCatalogId?: number;
}

export function LabResultsTrendViewer({ petId, testCatalogId }: LabResultsTrendViewerProps) {
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all");

  // Fetch all lab results for this pet
  const {
    data: labResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/lab/results/pet/${petId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lab/results/pet/${petId}`);
      return await response.json();
    },
    enabled: !!petId,
  });

  // Get unique test parameters across all results
  const parameters = useMemo(() => {
    if (!labResults) return [];
    
    const paramSet = new Set<string>();
    
    labResults.forEach((result: any) => {
      if (result.results && typeof result.results === 'object') {
        // Check if results is an array of test parameters
        if (Array.isArray(result.results.tests)) {
          result.results.tests.forEach((test: any) => {
            if (test.name) {
              paramSet.add(test.name);
            }
          });
        } else if (typeof result.results === 'object') {
          // Handle flat structure
          Object.keys(result.results).forEach(key => {
            if (key !== 'date' && key !== 'notes' && key !== 'status') {
              paramSet.add(key);
            }
          });
        }
      }
    });
    
    return Array.from(paramSet).sort();
  }, [labResults]);

  // Filter results based on selected test catalog ID if provided
  const filteredResults = useMemo(() => {
    if (!labResults) return [];
    
    let filtered = labResults;
    
    if (testCatalogId) {
      filtered = filtered.filter((result: any) => 
        result.testCatalogId === testCatalogId
      );
    }
    
    // Apply time range filter
    if (timeRange !== "all") {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (timeRange) {
        case "1m":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case "3m":
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case "6m":
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case "1y":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter((result: any) => 
        new Date(result.resultDate) >= cutoffDate
      );
    }
    
    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => 
      new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime()
    );
  }, [labResults, testCatalogId, timeRange]);

  // Extract trend data for the selected parameter
  const trendData = useMemo(() => {
    if (!filteredResults || !selectedParameter) return [];
    
    return filteredResults
      .map((result: any) => {
        let value = null;
        let flag = "normal";
        let referenceRange = "";
        
        // Extract parameter value from result
        if (result.results && typeof result.results === 'object') {
          // Handle array structure
          if (Array.isArray(result.results.tests)) {
            const paramTest = result.results.tests.find(
              (test: any) => test.name === selectedParameter
            );
            
            if (paramTest) {
              value = extractNumericValue(paramTest.value);
              flag = paramTest.flag || "normal";
              referenceRange = paramTest.normalRange || "";
            }
          } else if (typeof result.results === 'object') {
            // Handle flat structure
            if (result.results[selectedParameter] !== undefined) {
              if (typeof result.results[selectedParameter] === 'object') {
                value = extractNumericValue(result.results[selectedParameter].value);
                flag = result.results[selectedParameter].flag || "normal";
                referenceRange = result.results[selectedParameter].normalRange || "";
              } else {
                value = extractNumericValue(result.results[selectedParameter]);
              }
            }
          }
        }
        
        // Skip results where we couldn't extract a value
        if (value === null) return null;
        
        // Parse reference range for min/max values
        let minValue = null;
        let maxValue = null;
        
        if (referenceRange) {
          // Parse ranges like "5.5-8.5 M/μL"
          const rangeMatch = referenceRange.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
          if (rangeMatch) {
            minValue = parseFloat(rangeMatch[1]);
            maxValue = parseFloat(rangeMatch[3]);
          }
        }
        
        return {
          date: format(new Date(result.resultDate), "MMM d, yyyy"),
          timestamp: new Date(result.resultDate).getTime(),
          value,
          flag,
          minValue,
          maxValue,
          rawResult: result
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a: any, b: any) => a.timestamp - b.timestamp); // Sort by date (oldest first for charts)
  }, [filteredResults, selectedParameter]);

  // Helper function to extract numeric value from string values like "6.5 M/μL"
  const extractNumericValue = (valueStr: any): number | null => {
    if (valueStr === undefined || valueStr === null) return null;
    
    // If already a number, return it
    if (typeof valueStr === 'number') return valueStr;
    
    // If string, try to extract the numeric part
    if (typeof valueStr === 'string') {
      const match = valueStr.match(/(\d+(\.\d+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    
    return null;
  };

  // Find reference range for the selected parameter
  const referenceRange = useMemo(() => {
    if (!filteredResults.length || !selectedParameter) return null;
    
    // Look through the results to find a reference range
    for (const result of filteredResults) {
      if (result.results && typeof result.results === 'object') {
        // Handle array structure
        if (Array.isArray(result.results.tests)) {
          const paramTest = result.results.tests.find(
            (test: any) => test.name === selectedParameter
          );
          
          if (paramTest && paramTest.normalRange) {
            return paramTest.normalRange;
          }
        } else if (typeof result.results === 'object') {
          // Handle flat structure
          if (result.results[selectedParameter] && 
              typeof result.results[selectedParameter] === 'object' && 
              result.results[selectedParameter].normalRange) {
            return result.results[selectedParameter].normalRange;
          }
        }
      }
    }
    
    return null;
  }, [filteredResults, selectedParameter]);

  // Format the colors for status in the chart
  const getFlagColor = (flag: string) => {
    switch(flag) {
      case 'critical':
        return '#ef4444';
      case 'abnormal':
        return '#f97316';
      case 'normal':
      default:
        return '#22c55e';
    }
  };

  // Calculate statistics for the selected parameter
  const stats = useMemo(() => {
    if (!trendData.length) return null;
    
    const values = trendData.map(item => item.value).filter(Boolean) as number[];
    
    if (!values.length) return null;
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const latest = trendData[trendData.length - 1];
    
    // Calculate trend 
    const trend = trendData.length > 1 
      ? (latest.value > trendData[0].value ? 'increasing' : 
         latest.value < trendData[0].value ? 'decreasing' : 'stable')
      : 'none';
    
    // Calculate percentage change from first to last
    const percentChange = trendData.length > 1 
      ? ((latest.value - trendData[0].value) / trendData[0].value) * 100
      : 0;
    
    return {
      avg: avg.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      latest: latest.value.toFixed(2),
      count: values.length,
      trend,
      percentChange: percentChange.toFixed(1),
      abnormalCount: trendData.filter(item => item.flag !== 'normal').length
    };
  }, [trendData]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lab Result Trends</CardTitle>
          <CardDescription>Loading lab results...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Lab Results</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-md bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4 mr-2 inline" />
            Unable to load lab results. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no results
  if (!filteredResults.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lab Result Trends</CardTitle>
          <CardDescription>
            No lab results available for analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            <InfoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No lab results have been recorded for this patient.</p>
            <p className="mt-2">Order labs to begin tracking values over time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Lab Result Trends</CardTitle>
            <CardDescription>
              Track changes in laboratory values over time
            </CardDescription>
          </div>
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pb-1">
        {parameters.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No valid lab parameters found in the results
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Select
                value={selectedParameter || ""}
                onValueChange={setSelectedParameter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parameter to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {parameters.map(param => (
                    <SelectItem key={param} value={param}>
                      {param}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedParameter ? (
              <>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-muted-foreground text-sm">Latest Value</div>
                        <div className="text-2xl font-bold mt-1">
                          {stats.latest}
                        </div>
                        <div className="flex items-center mt-1 text-sm">
                          {stats.trend === 'increasing' && <TrendingUp className="text-red-500 h-4 w-4 mr-1" />}
                          {stats.trend === 'decreasing' && <TrendingDown className="text-blue-500 h-4 w-4 mr-1" />}
                          {stats.trend === 'stable' && <Minus className="text-gray-500 h-4 w-4 mr-1" />}
                          <span className={
                            stats.trend === 'increasing' ? 'text-red-500' : 
                            stats.trend === 'decreasing' ? 'text-blue-500' : 
                            'text-gray-500'
                          }>
                            {stats.percentChange !== '0.0' ? `${stats.percentChange}%` : 'No change'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-muted-foreground text-sm">Average</div>
                        <div className="text-2xl font-bold mt-1">{stats.avg}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          over {stats.count} measurements
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-muted-foreground text-sm">Range</div>
                        <div className="text-2xl font-bold mt-1">{stats.min} - {stats.max}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          min - max
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-muted-foreground text-sm">Abnormal Values</div>
                        <div className="text-2xl font-bold mt-1">
                          {stats.abnormalCount}
                          <span className="text-sm font-normal ml-1">/ {stats.count}</span>
                        </div>
                        <div className="text-sm mt-1">
                          {stats.abnormalCount > 0 ? (
                            <span className="text-orange-500 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {Math.round((stats.abnormalCount / stats.count) * 100)}% abnormal
                            </span>
                          ) : (
                            <span className="text-green-500">All normal</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Tabs defaultValue="chart">
                  <TabsList className="mb-2">
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chart" className="min-h-[300px]">
                    {trendData.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No valid data points available for this parameter
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={trendData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis 
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-background border p-2 rounded-md shadow-md">
                                      <p className="font-bold">{label}</p>
                                      <p className="text-sm">
                                        Value: <span className="font-medium">{data.value}</span>
                                      </p>
                                      {data.minValue !== null && data.maxValue !== null && (
                                        <p className="text-sm">
                                          Reference: {data.minValue} - {data.maxValue}
                                        </p>
                                      )}
                                      <Badge 
                                        variant={data.flag === 'normal' ? 'outline' : 'destructive'}
                                        className="mt-1"
                                      >
                                        {data.flag}
                                      </Badge>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                            
                            {/* Generate reference range area if available */}
                            {trendData[0]?.minValue !== null && trendData[0]?.maxValue !== null && (
                              <Area
                                type="monotone"
                                dataKey="value"
                                name={`${selectedParameter} (Reference Range)`}
                                stroke="transparent"
                                fill="rgba(34, 197, 94, 0.1)"
                                activeDot={false}
                                legendType="none"
                                data={[
                                  { date: trendData[0].date, value: trendData[0].maxValue },
                                  { date: trendData[trendData.length - 1].date, value: trendData[0].maxValue }
                                ]}
                                baseValue={trendData[0].minValue}
                              />
                            )}
                            
                            {/* Reference lines for min and max values if available */}
                            {trendData[0]?.minValue !== null && (
                              <ReferenceLine
                                y={trendData[0].minValue}
                                stroke="#22c55e"
                                strokeDasharray="3 3"
                                label={{ 
                                  value: 'Min', 
                                  position: 'insideBottomLeft', 
                                  fill: '#22c55e', 
                                  fontSize: 10 
                                }}
                              />
                            )}
                            
                            {trendData[0]?.maxValue !== null && (
                              <ReferenceLine
                                y={trendData[0].maxValue}
                                stroke="#22c55e"
                                strokeDasharray="3 3"
                                label={{ 
                                  value: 'Max', 
                                  position: 'insideTopLeft', 
                                  fill: '#22c55e', 
                                  fontSize: 10 
                                }}
                              />
                            )}
                            
                            <Line
                              type="monotone"
                              dataKey="value"
                              name={selectedParameter}
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              activeDot={{ 
                                r: 8,
                                stroke: "hsl(var(--primary))",
                                strokeWidth: 1,
                                fill: ({ payload }) => getFlagColor(payload.flag)
                              }}
                              dot={{ 
                                r: 4,
                                stroke: "hsl(var(--primary))",
                                strokeWidth: 1,
                                fill: ({ payload }) => getFlagColor(payload.flag)
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="table">
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reference Range</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trendData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center h-24">
                                No data available
                              </TableCell>
                            </TableRow>
                          ) : (
                            trendData.map((result, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {result.date}
                                </TableCell>
                                <TableCell>
                                  {result.value}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={result.flag === 'normal' ? 'outline' : 'destructive'}
                                  >
                                    {result.flag}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {result.minValue !== null && result.maxValue !== null 
                                    ? `${result.minValue} - ${result.maxValue}` 
                                    : referenceRange || 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="p-6 text-center text-muted-foreground border border-dashed rounded-md">
                <p>Select a parameter from the dropdown to view trends over time</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground pt-2">
        {referenceRange && selectedParameter && (
          <div>
            Reference range for {selectedParameter}: {referenceRange}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}