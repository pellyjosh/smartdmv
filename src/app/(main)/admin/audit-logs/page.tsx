'use client';

import React, { useState, useEffect } from 'react';
import { History, Shield, Filter, FileText, Eye, Clock, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from '@/lib/date-utils';
import { SYSTEM_USER_NAME } from '@/lib/audit-constants';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Define the record types that can be filtered
const RecordTypes = [
  { value: 'role', label: 'Roles' },
  { value: 'permission', label: 'Permissions' },
  { value: 'permission_override', label: 'Permission Overrides' },
  { value: 'user_role_assignment', label: 'User Role Assignments' },
  { value: 'soap_note', label: 'SOAP Notes' },
  { value: 'lab_result', label: 'Lab Results' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'vaccination', label: 'Vaccinations' },
  { value: 'treatment', label: 'Treatments' },
  { value: 'health_plan', label: 'Health Plans' }
];

// Define the actions that can be filtered
const ActionTypes = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'view', label: 'View' },
  { value: 'lock', label: 'Lock' }
];

// Define the filter form schema
const filterFormSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type FilterFormValues = z.infer<typeof filterFormSchema>;

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [recordType, setRecordType] = useState('permission_override');
  const [filters, setFilters] = useState<FilterFormValues>({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Setup form
  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      search: '',
      action: '',
    }
  });

  // Build query parameters based on filters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    
    return params.toString();
  };

  // Use query to fetch audit logs based on selected record type and filters
  const {
    data: auditLogs,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/audit-logs/${recordType}`, filters],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/audit-logs/${recordType}${queryParams ? `?${queryParams}` : ''}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch audit logs');
      }
      
      return response.json();
    },
    enabled: !!recordType,
  });

  // Handle form submission for filtering
  const onSubmit = (data: FilterFormValues) => {
    setFilters(data);
    refetch();
  };

  // View detailed log information
  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  // Export logs as CSV
  const handleExportLogs = async () => {
    try {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/audit-logs/${recordType}/export${queryParams ? `?${queryParams}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to export logs');
      }
      
      const csvData = await response.text();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${recordType}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Successful',
        description: 'Audit logs have been exported to CSV.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // If there's an error, display a toast notification
  useEffect(() => {
    if (isError && error) {
      toast({
        title: 'Error fetching audit logs',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
  // Use dayjs-compatible format tokens (format util uses dayjs)
  // e.g. 'LL' -> 'September 2, 2025', 'h:mm A' -> '3:45 PM'
  return `${format(date, 'LL')} at ${format(date, 'h:mm A')}`;
  };

  // Render badge based on action type
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800">Create</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800">Update</Badge>;
      case 'delete':
        return <Badge className="bg-red-100 text-red-800">Delete</Badge>;
      case 'view':
        return <Badge className="bg-gray-100 text-gray-800">View</Badge>;
      case 'lock':
        return <Badge className="bg-yellow-100 text-yellow-800">Lock</Badge>;
      default:
        return <Badge className="bg-purple-100 text-purple-800">{action}</Badge>;
    }
  };

  // Get a human-readable name for the selected record type
  const getRecordTypeName = () => {
    const recordTypeObj = RecordTypes.find(rt => rt.value === recordType);
    return recordTypeObj ? recordTypeObj.label : 'Audit Logs';
  };

  return (
    <div className="container py-6 mx-auto">
      <PageHeader
        title="Audit Logs"
        description="Review and analyze system activity logs"
        actions={
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <History className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        }
      />

      <Tabs defaultValue={recordType} onValueChange={setRecordType} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-5 lg:w-auto">
            <TabsTrigger value="permission_override">Permission Overrides</TabsTrigger>
            <TabsTrigger value="user_role_assignment">Role Assignments</TabsTrigger>
            <TabsTrigger value="role">Roles</TabsTrigger>
            <TabsTrigger value="soap_note">SOAP Notes</TabsTrigger>
            <TabsTrigger value="lab_result">Lab Results</TabsTrigger>
          </TabsList>
        </div>

        {RecordTypes.map(rt => (
          <TabsContent key={rt.value} value={rt.value}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {rt.label} Audit Log
                </CardTitle>
                <CardDescription>
                  View and filter audit logs for {rt.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filter Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="search"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Search</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search logs..." className="pl-8" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="action"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Action</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                {ActionTypes.map(action => (
                                  <SelectItem key={action.value} value={action.value}>
                                    {action.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              placeholder="Select start date"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              placeholder="Select end date"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          form.reset();
                          setFilters({});
                          refetch();
                        }}
                      >
                        Reset
                      </Button>
                      <Button type="submit">
                        <Filter className="h-4 w-4 mr-2" />
                        Apply Filters
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* Audit Logs Table */}
                <div className="border rounded-md">
                  <Table>
                    <TableCaption>
                      {isLoading ? 
                        'Loading audit logs...' : 
                        auditLogs?.length > 0 ? 
                          `Showing ${auditLogs.length} audit logs for ${getRecordTypeName()}` : 
                          'No audit logs found'
                      }
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                          </TableRow>
                        ))
                      ) : auditLogs?.length > 0 ? (
                        // Actual audit logs data
                        auditLogs.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                {formatDate(log.timestamp)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.user ? log.user.name : SYSTEM_USER_NAME}
                            </TableCell>
                            <TableCell>
                              {renderActionBadge(log.action)}
                            </TableCell>
                            <TableCell>
                              {log.description || 'No description provided'}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewDetails(log)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        // No data state
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No audit logs found for this record type and filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Date & Time</h4>
                  <p>{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Action</h4>
                  <p>{renderActionBadge(selectedLog.action)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">User</h4>
                  <p>{selectedLog.user ? selectedLog.user.name : SYSTEM_USER_NAME}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">IP Address</h4>
                  <p>{selectedLog.ipAddress || 'Not recorded'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p>{selectedLog.description || 'No description provided'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Record Type</h4>
                <p>{getRecordTypeName()}</p>
              </div>
              
              {selectedLog.metadata && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Additional Metadata</h4>
                  <div className="bg-gray-50 p-3 rounded-md mt-1 max-h-48 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {selectedLog.changes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Changes</h4>
                  <div className="bg-gray-50 p-3 rounded-md mt-1 max-h-48 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {selectedLog.reason && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Reason</h4>
                  <p>{selectedLog.reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
