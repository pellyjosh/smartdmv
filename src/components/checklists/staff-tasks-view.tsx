import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChecklistItem } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, isValid } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  User,
  SortAsc,
  SortDesc,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";


export function StaffTasksView() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  // Fetch all items assigned to the current user
  const { data: assignedItems, isLoading } = useQuery({
    queryKey: ["/api/checklist-items/my-items"],
    queryFn: async () => {
      const response = await fetch("/api/checklist-items/my-items");
      if (!response.ok) {
        throw new Error("Failed to fetch assigned items");
      }
      return response.json();
    },
  });

  // Function to get due date status
  const getDueStatus = (dueDate: string | null | undefined) => {
    if (!dueDate) return "no-date";
    
    const today = new Date();
    const due = new Date(dueDate);
    
    // Check if due date is today
    if (
      due.getDate() === today.getDate() &&
      due.getMonth() === today.getMonth() &&
      due.getFullYear() === today.getFullYear()
    ) {
      return "today";
    }
    
    // Check if due date is in the past
    if (due < today) {
      return "overdue";
    }
    
    // Due date is in the future
    return "upcoming";
  };

  // Mutation to mark an item as complete
  const completeMutation = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: number; notes: string }) => {
      const response = await fetch(`/api/checklist-items/${itemId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark item as complete");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task marked as complete",
        description: "The checklist item has been completed successfully.",
      });
      setDialogOpen(false);
      setCompletionNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-items/my-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter items based on search query and filters
  const filteredItems = React.useMemo(() => {
    if (!assignedItems) return [];
    
    let filteredResults = assignedItems.filter((item: ChecklistItem) => {
      // Filter by search query
      const matchesSearch = 
        searchQuery === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by status
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "completed" && item.completed) || 
        (statusFilter === "pending" && !item.completed);
      
      // Filter by priority
      const matchesPriority = 
        priorityFilter === "all" || 
        item.priority === priorityFilter;
      
      // Filter by due date status
      const dueStatus = getDueStatus(item.dueDate);
      const matchesDueDate = 
        dueDateFilter === "all" || 
        (dueDateFilter === "today" && dueStatus === "today") || 
        (dueDateFilter === "overdue" && dueStatus === "overdue") || 
        (dueDateFilter === "upcoming" && dueStatus === "upcoming") || 
        (dueDateFilter === "none" && dueStatus === "no-date");
      
      // Filter by date range
      let matchesDateRange = true;
      if (fromDate && item.dueDate) {
        const itemDate = parseISO(item.dueDate);
        if (isValid(itemDate)) {
          matchesDateRange = isWithinInterval(itemDate, {
            start: startOfDay(fromDate),
            end: toDate ? endOfDay(toDate) : new Date(2099, 11, 31) // If no end date, use a far future date
          });
        }
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate && matchesDateRange;
    });
    
    // Sort the items
    return filteredResults.sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return sortOrder === "asc" ? 1 : -1;
        if (!b.dueDate) return sortOrder === "asc" ? -1 : 1;
        
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return sortOrder === "asc" 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      } 
      else if (sortBy === "priority") {
        const priorityOrder = { high: 3, medium: 2, low: 1, undefined: 0 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        return sortOrder === "asc" 
          ? aPriority - bPriority 
          : bPriority - aPriority;
      }
      else if (sortBy === "title") {
        return sortOrder === "asc" 
          ? a.title.localeCompare(b.title) 
          : b.title.localeCompare(a.title);
      }
      
      return 0;
    });
  }, [assignedItems, searchQuery, statusFilter, priorityFilter, dueDateFilter, fromDate, toDate, sortBy, sortOrder, getDueStatus]);

  // Group items by checklist
  const itemsByChecklist = React.useMemo(() => {
    if (!filteredItems) return {};
    
    return filteredItems.reduce((acc: any, item: any) => {
      if (!acc[item.checklistId]) {
        acc[item.checklistId] = {
          checklistName: item.checklistName || `Checklist #${item.checklistId}`,
          items: [],
        };
      }
      acc[item.checklistId].items.push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  // Handler for completing an item
  const handleCompleteItem = (itemId: number) => {
    setSelectedItemId(itemId);
    setDialogOpen(true);
  };

  // Function to submit completion
  const handleSubmitCompletion = () => {
    if (selectedItemId) {
      completeMutation.mutate({
        itemId: selectedItemId,
        notes: completionNotes,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold">My Assigned Tasks</h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 md:w-64"
            />
            <Filter className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            Filters 
            {(statusFilter !== "all" || 
              priorityFilter !== "all" || 
              dueDateFilter !== "all" || 
              fromDate || 
              sortBy !== "dueDate" || 
              sortOrder !== "asc") && 
              <Badge variant="secondary" className="ml-1">Active</Badge>
            }
          </Button>
        </div>
      </div>
      
      <Collapsible open={filterOpen} onOpenChange={setFilterOpen} className="mb-4">
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter By Status</h3>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter By Priority</h3>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Priority</SelectLabel>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter By Due Date</h3>
                  <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by due date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Due Date</SelectLabel>
                        <SelectItem value="all">All Due Dates</SelectItem>
                        <SelectItem value="today">Due Today</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="none">No Due Date</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Sort By</h3>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Sort By</SelectLabel>
                        <SelectItem value="dueDate">Due Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="title">Task Name</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Sort Order</h3>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Sort Order</SelectLabel>
                        <SelectItem value="asc">
                          <div className="flex items-center">
                            <SortAsc className="mr-2 h-4 w-4" />
                            Ascending
                          </div>
                        </SelectItem>
                        <SelectItem value="desc">
                          <div className="flex items-center">
                            <SortDesc className="mr-2 h-4 w-4" />
                            Descending
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Date Range</h3>
                  <div className="flex flex-row items-center space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, "PPP") : "From date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "PPP") : "To date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                          disabled={fromDate ? undefined : (date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setDueDateFilter("all");
                    setSortBy("dueDate");
                    setSortOrder("asc");
                    setFromDate(undefined);
                    setToDate(undefined);
                  }}
                  className="mr-2"
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-6 mt-6">
          {filteredItems && filteredItems.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p>No assigned tasks found based on your filters.</p>
              </CardContent>
            </Card>
          ) : (
            Object.values(itemsByChecklist).map((group: any) => (
              <Card key={group.checklistName}>
                <CardHeader>
                  <CardTitle>{group.checklistName}</CardTitle>
                  <CardDescription>
                    {group.items.filter((item: any) => item.completed).length} of {group.items.length} tasks completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {group.items.map((item: any) => {
                      const dueStatus = getDueStatus(item.dueDate);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-4 border rounded-lg ${
                            item.completed 
                              ? "bg-gray-50 border-gray-200" 
                              : dueStatus === "overdue"
                              ? "bg-red-50 border-red-200"
                              : dueStatus === "today"
                              ? "bg-yellow-50 border-yellow-200"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              {item.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                              ) : dueStatus === "overdue" ? (
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                              ) : dueStatus === "today" ? (
                                <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                              ) : (
                                <div className="h-5 w-5 border-2 border-gray-300 rounded-full mt-0.5" />
                              )}
                              <div>
                                <h3 className={`font-medium ${item.completed ? "line-through text-gray-500" : ""}`}>
                                  {item.title}
                                </h3>
                                {item.description && (
                                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {item.dueDate && (
                                    <div className="flex items-center text-xs text-gray-500">
                                      <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                                      Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                                    </div>
                                  )}
                                  {item.priority && (
                                    <Badge variant={
                                      item.priority === "high" 
                                        ? "destructive" 
                                        : item.priority === "medium" 
                                        ? "default" 
                                        : "outline"
                                    }>
                                      {item.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!item.completed && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleCompleteItem(item.id)}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="table">
          <div className="rounded-md border">
            <Table>
              <TableCaption>List of your assigned checklist items</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems && filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No assigned tasks found based on your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item: any) => {
                    const dueStatus = getDueStatus(item.dueDate);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : dueStatus === "overdue" ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : dueStatus === "today" ? (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className={item.completed ? "line-through text-gray-500" : ""}>
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {item.description.length > 50 
                                ? `${item.description.substring(0, 50)}...` 
                                : item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {itemsByChecklist[item.checklistId]?.checklistName || `Checklist #${item.checklistId}`}
                        </TableCell>
                        <TableCell>
                          {item.dueDate 
                            ? format(new Date(item.dueDate), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item.priority ? (
                            <Badge variant={
                              item.priority === "high" 
                                ? "destructive" 
                                : item.priority === "medium" 
                                ? "default" 
                                : "outline"
                            }>
                              {item.priority}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!item.completed && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleCompleteItem(item.id)}
                            >
                              Complete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Add any notes or comments about completing this task.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Completion notes (optional)"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            className="min-h-[100px]"
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitCompletion}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Submitting..." : "Mark as Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}