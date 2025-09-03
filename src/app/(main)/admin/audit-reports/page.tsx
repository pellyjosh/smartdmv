'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, DownloadIcon, BarChart, ListFilter, FileText } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

export default function AuditReportsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("reports");
  const [reportFilter, setReportFilter] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    recordType: "ALL" as string,
    userId: "" as string,
    practiceId: "" as string,
    organizationId: "" as string,
    action: "ALL" as string,
    groupBy: "day" as "day" | "week" | "month" | "user" | "action" | "recordType",
    format: "json" as "json" | "csv"
  });

  // Fetch audit reports based on filters
  const { data: reportData, isLoading: isReportLoading, refetch: refetchReport } = useQuery({
    queryKey: ["/api/audit-reports/reports", reportFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (reportFilter.startDate) {
        params.append("startDate", reportFilter.startDate.toISOString());
      }
      if (reportFilter.endDate) {
        params.append("endDate", reportFilter.endDate.toISOString());
      }
      if (reportFilter.recordType && reportFilter.recordType !== "ALL") {
        params.append("recordType", reportFilter.recordType);
      }
      if (reportFilter.userId) {
        params.append("userId", reportFilter.userId);
      }
      if (reportFilter.practiceId) {
        params.append("practiceId", reportFilter.practiceId);
      }
      if (reportFilter.organizationId) {
        params.append("organizationId", reportFilter.organizationId);
      }
      if (reportFilter.action && reportFilter.action !== "ALL") {
        params.append("action", reportFilter.action);
      }
      if (reportFilter.groupBy) {
        params.append("groupBy", reportFilter.groupBy);
      }
      
      // Don't include format parameter, as we want JSON for display
      // We'll handle CSV download separately
      
      const queryString = params.toString();
      return fetch(`/api/audit-reports/reports${queryString ? `?${queryString}` : ''}`).then(res => {
        if (!res.ok) throw new Error("Failed to fetch report data");
        return res.json();
      });
    },
    enabled: activeTab === "reports",
    retry: 1
  });

  // Fetch audit statistics
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/audit-reports/statistics", reportFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (reportFilter.startDate) {
        params.append("startDate", reportFilter.startDate.toISOString());
      }
      if (reportFilter.endDate) {
        params.append("endDate", reportFilter.endDate.toISOString());
      }
      if (reportFilter.recordType && reportFilter.recordType !== "ALL") {
        params.append("recordType", reportFilter.recordType);
      }
      if (reportFilter.userId) {
        params.append("userId", reportFilter.userId);
      }
      if (reportFilter.practiceId) {
        params.append("practiceId", reportFilter.practiceId);
      }
      if (reportFilter.organizationId) {
        params.append("organizationId", reportFilter.organizationId);
      }
      if (reportFilter.action && reportFilter.action !== "ALL") {
        params.append("action", reportFilter.action);
      }
      
      const queryString = params.toString();
      return fetch(`/api/audit-reports/statistics${queryString ? `?${queryString}` : ''}`).then(res => {
        if (!res.ok) throw new Error("Failed to fetch statistics data");
        return res.json();
      });
    },
    enabled: activeTab === "statistics",
    retry: 1
  });

  // Function to download report as CSV
  const downloadReportAsCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (reportFilter.startDate) {
        params.append("startDate", reportFilter.startDate.toISOString());
      }
      if (reportFilter.endDate) {
        params.append("endDate", reportFilter.endDate.toISOString());
      }
      if (reportFilter.recordType && reportFilter.recordType !== "ALL") {
        params.append("recordType", reportFilter.recordType);
      }
      if (reportFilter.userId) {
        params.append("userId", reportFilter.userId);
      }
      if (reportFilter.practiceId) {
        params.append("practiceId", reportFilter.practiceId);
      }
      if (reportFilter.organizationId) {
        params.append("organizationId", reportFilter.organizationId);
      }
      if (reportFilter.action && reportFilter.action !== "ALL") {
        params.append("action", reportFilter.action);
      }
      if (reportFilter.groupBy) {
        params.append("groupBy", reportFilter.groupBy);
      }
      
      // Add format=csv parameter
      params.append("format", "csv");
      
      const queryString = params.toString();
      const response = await fetch(`/api/audit-reports/reports?${queryString}`);
      
      if (!response.ok) {
        throw new Error("Failed to download CSV report");
      }
      
      const csvData = await response.text();
      
      // Create a downloadable file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report Downloaded",
        description: "The CSV report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading CSV report:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the report as CSV. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Record types for filtering
  const recordTypes = [
    { value: "ALL", label: "All Types" },
    { value: "SOAP_NOTE", label: "SOAP Notes" },
    { value: "LAB_RESULT", label: "Lab Results" },
    { value: "PRESCRIPTION", label: "Prescriptions" },
    { value: "PERMISSION", label: "Permissions" },
    { value: "ROLE", label: "Roles" },
    { value: "PERMISSION_OVERRIDE", label: "Permission Overrides" },
    { value: "USER_ROLE_ASSIGNMENT", label: "User Role Assignments" },
  ];

  // Action types for filtering
  const actionTypes = [
    { value: "ALL", label: "All Actions" },
    { value: "CREATE", label: "Create" },
    { value: "VIEW", label: "View" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "LOCK", label: "Lock" },
    { value: "UNLOCK", label: "Unlock" },
    { value: "ASSIGN", label: "Assign" },
    { value: "UNASSIGN", label: "Unassign" },
    { value: "APPROVE", label: "Approve" },
    { value: "REJECT", label: "Reject" },
  ];

  // Group by options
  const groupByOptions = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "user", label: "User" },
    { value: "action", label: "Action" },
    { value: "recordType", label: "Record Type" },
  ];

  return (
    <div className="container py-6 mx-auto">
      <PageHeader
        title="Audit Reports"
        description="Generate and analyze detailed audit reports for compliance purposes"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText size={16} />
            <span>Reports</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart size={16} />
            <span>Statistics</span>
          </TabsTrigger>
        </TabsList>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filter Options</CardTitle>
            <CardDescription>
              Customize your report by applying the following filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date Range */}
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="start-date"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !reportFilter.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportFilter.startDate ? (
                        format(reportFilter.startDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportFilter.startDate}
                      onSelect={(date) =>
                        setReportFilter({ ...reportFilter, startDate: date || undefined })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="end-date"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !reportFilter.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportFilter.endDate ? (
                        format(reportFilter.endDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportFilter.endDate}
                      onSelect={(date) =>
                        setReportFilter({ ...reportFilter, endDate: date || undefined })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Record Type */}
              <div>
                <Label htmlFor="record-type">Record Type</Label>
                <Select 
                  value={reportFilter.recordType}
                  onValueChange={(value) => setReportFilter({ ...reportFilter, recordType: value })}
                >
                  <SelectTrigger id="record-type" className="mt-2">
                    <SelectValue placeholder="Select record type" />
                  </SelectTrigger>
                  <SelectContent>
                    {recordTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Action */}
              <div>
                <Label htmlFor="action">Action</Label>
                <Select 
                  value={reportFilter.action}
                  onValueChange={(value) => setReportFilter({ ...reportFilter, action: value })}
                >
                  <SelectTrigger id="action" className="mt-2">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* User ID */}
              <div>
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  type="number"
                  placeholder="Enter user ID"
                  className="mt-2"
                  value={reportFilter.userId}
                  onChange={(e) => setReportFilter({ ...reportFilter, userId: e.target.value })}
                />
              </div>
              
              {/* Practice ID */}
              <div>
                <Label htmlFor="practice-id">Practice ID</Label>
                <Input
                  id="practice-id"
                  type="number"
                  placeholder="Enter practice ID"
                  className="mt-2"
                  value={reportFilter.practiceId}
                  onChange={(e) => setReportFilter({ ...reportFilter, practiceId: e.target.value })}
                />
              </div>
              
              {/* Organization ID */}
              <div>
                <Label htmlFor="organization-id">Organization ID</Label>
                <Input
                  id="organization-id"
                  placeholder="Enter organization ID"
                  className="mt-2"
                  value={reportFilter.organizationId}
                  onChange={(e) => setReportFilter({ ...reportFilter, organizationId: e.target.value })}
                />
              </div>
              
              {/* Group By (only for Reports tab) */}
              {activeTab === "reports" && (
                <div>
                  <Label htmlFor="group-by">Group By</Label>
                  <Select 
                    value={reportFilter.groupBy}
                    onValueChange={(value: any) => setReportFilter({ 
                      ...reportFilter, 
                      groupBy: value as "day" | "week" | "month" | "user" | "action" | "recordType"
                    })}
                  >
                    <SelectTrigger id="group-by" className="mt-2">
                      <SelectValue placeholder="Select grouping" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupByOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-8 space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setReportFilter({
                    startDate: undefined,
                    endDate: undefined,
                    recordType: "ALL",
                    userId: "",
                    practiceId: "",
                    organizationId: "",
                    action: "ALL",
                    groupBy: "day",
                    format: "json"
                  });
                }}
              >
                Reset Filters
              </Button>
              
              {activeTab === "reports" && (
                <Button 
                  variant="outline"
                  onClick={downloadReportAsCsv}
                  className="flex items-center"
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              )}
              
              <Button
                onClick={() => {
                  if (activeTab === "reports") {
                    refetchReport();
                  } else {
                    // refetch statistics
                  }
                }}
                className="flex items-center"
              >
                <ListFilter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Reports</CardTitle>
              <CardDescription>
                Detailed audit log reports based on your filter criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isReportLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : reportData ? (
                <div className="overflow-x-auto">
                  {Object.keys(reportData).length > 0 ? (
                    <div>
                      {Object.entries(reportData).map(([key, logs]: [string, any]) => (
                        <div key={key} className="mb-8">
                          <h3 className="text-lg font-bold mb-4 border-b pb-2">{key}</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-full">
                              <thead>
                                <tr className="bg-muted">
                                  <th className="text-left p-2 border">ID</th>
                                  <th className="text-left p-2 border">Timestamp</th>
                                  <th className="text-left p-2 border">Action</th>
                                  <th className="text-left p-2 border">Record Type</th>
                                  <th className="text-left p-2 border">Record ID</th>
                                  <th className="text-left p-2 border">User</th>
                                  <th className="text-left p-2 border">Practice</th>
                                </tr>
                              </thead>
                              <tbody>
                                {logs.map((log: any) => (
                                  <tr key={log.id} className="border-b hover:bg-muted/50">
                                    <td className="p-2 border">{log.id}</td>
                                    <td className="p-2 border">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-2 border">
                                      <Badge variant={log.action === 'CREATE' ? 'default' : 
                                                    log.action === 'UPDATE' ? 'secondary' : 
                                                    log.action === 'DELETE' ? 'destructive' : 'outline'}>
                                        {log.action}
                                      </Badge>
                                    </td>
                                    <td className="p-2 border">{log.recordType}</td>
                                    <td className="p-2 border">{log.recordId}</td>
                                    <td className="p-2 border">{log.userId ? `ID: ${log.userId}` : '-'}</td>
                                    <td className="p-2 border">{log.practiceId ? `ID: ${log.practiceId}` : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No results found for the selected filters.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Apply filters to generate a report.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Statistics</CardTitle>
              <CardDescription>
                Statistical analysis of audit logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : statsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Action Distribution */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Action Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {statsData.actionDistribution && Object.entries(statsData.actionDistribution || {}).map(([action, count]: [string, any]) => (
                          <div key={action} className="flex items-center">
                            <span className="w-24 font-medium">{action}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mx-4">
                              <div 
                                className="h-full bg-primary" 
                                style={{ 
                                  width: `${statsData.totalLogs > 0 ? (count / statsData.totalLogs) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                          </div>
                        ))}
                        {(!statsData.actionDistribution || Object.keys(statsData.actionDistribution || {}).length === 0) && (
                          <div className="text-center py-4 text-muted-foreground">No action data available</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Record Type Distribution */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Record Type Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {statsData.recordTypeDistribution && Object.entries(statsData.recordTypeDistribution || {}).map(([recordType, count]: [string, any]) => (
                          <div key={recordType} className="flex items-center">
                            <span className="w-32 font-medium text-sm">{recordType}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mx-4">
                              <div 
                                className="h-full bg-primary" 
                                style={{ 
                                  width: `${statsData.totalLogs > 0 ? (count / statsData.totalLogs) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                          </div>
                        ))}
                        {(!statsData.recordTypeDistribution || Object.keys(statsData.recordTypeDistribution || {}).length === 0) && (
                          <div className="text-center py-4 text-muted-foreground">No record type data available</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* User Activity */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">User Activity (Top 5)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {statsData.userDistribution && Object.entries(statsData.userDistribution || {}).slice(0, 5).map(([userId, count]: [string, any]) => (
                          <div key={userId} className="flex items-center">
                            <span className="w-24 font-medium">User {userId}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mx-4">
                              <div 
                                className="h-full bg-primary" 
                                style={{ 
                                  width: `${statsData.totalLogs > 0 ? (count / statsData.totalLogs) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                          </div>
                        ))}
                        {(!statsData.userDistribution || Object.keys(statsData.userDistribution || {}).length === 0) && (
                          <div className="text-center py-4 text-muted-foreground">No user activity data available</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Hourly Distribution */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Hourly Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsData.hourlyDistribution && Object.keys(statsData.hourlyDistribution || {}).length > 0 ? (
                        <div className="grid grid-cols-12 gap-1 h-32">
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString();
                            const count = statsData.hourlyDistribution[hour] || 0;
                            const maxCount = Math.max(...Object.values(statsData.hourlyDistribution || {}).map(v => Number(v) || 0));
                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            
                            return (
                              <div key={hour} className="flex flex-col items-center">
                                <div className="w-full h-24 bg-muted flex flex-col-reverse rounded-sm">
                                  <div
                                    className="bg-primary w-full transition-all duration-500 rounded-sm"
                                    style={{ height: `${height}%` }}
                                    title={`${hour}:00 - ${count} activities`}
                                  ></div>
                                </div>
                                <span className="text-xs mt-1">{i}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">No hourly distribution data available</div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Summary Statistics */}
                  <Card className="shadow-sm md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Summary Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{statsData.totalLogs || 0}</div>
                          <div className="text-sm text-muted-foreground">Total Logs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {statsData.uniqueUsers || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Unique Users</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {Object.keys(statsData.actionDistribution || {}).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Action Types</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {Object.keys(statsData.recordTypeDistribution || {}).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Record Types</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Apply filters to generate statistics.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
