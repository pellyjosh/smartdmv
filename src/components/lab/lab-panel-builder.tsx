import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the schema for custom lab panels
const customPanelSchema = z.object({
  testName: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string(),
  description: z.string().optional(),
  provider: z.string(),
  price: z.string().optional(),
  isPanel: z.boolean().default(true),
  referenceRanges: z.any().optional(),
  instructions: z.string().optional(),
  // Add validation that at least one test must be selected
  panelTestIds: z.array(z.number()).min(1, "At least one test must be selected"),
});

export type CustomPanel = z.infer<typeof customPanelSchema>;

interface LabPanelBuilderProps {
  onPanelCreated?: () => void;
  editingPanel?: any;
}

export function LabPanelBuilder({ onPanelCreated, editingPanel }: LabPanelBuilderProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch available lab tests for selection
  const {
    data: availableTests,
    isLoading: isLoadingTests,
    error: testsError,
  } = useQuery({
    queryKey: ["/api/lab/tests-catalog"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lab/tests-catalog");
      return await response.json();
    },
  });

  // Form for custom panel creation
  const form = useForm<CustomPanel>({
    resolver: zodResolver(customPanelSchema),
    defaultValues: {
      testName: editingPanel?.testName || "",
      category: editingPanel?.category || "panel",
      description: editingPanel?.description || "",
      provider: editingPanel?.provider || "in_house",
      price: editingPanel?.price?.toString() || "",
      isPanel: true,
      instructions: editingPanel?.instructions || "",
      panelTestIds: editingPanel?.panelTestIds || [],
    },
  });

  // Update form when editing an existing panel
  useEffect(() => {
    if (editingPanel) {
      form.reset({
        testName: editingPanel.testName,
        category: editingPanel.category,
        description: editingPanel.description || "",
        provider: editingPanel.provider,
        price: editingPanel.price?.toString() || "",
        isPanel: true,
        instructions: editingPanel.instructions || "",
        panelTestIds: editingPanel.panelTestIds || [],
      });
      setSelectedTests(editingPanel.panelTestIds || []);
    }
  }, [editingPanel, form]);

  // Mutation for creating or updating a custom panel
  const panelMutation = useMutation({
    mutationFn: async (data: CustomPanel) => {
      if (editingPanel?.id) {
        // Update existing panel
        const response = await apiRequest(
          "PUT",
          `/api/lab/tests-catalog/${editingPanel.id}`,
          data
        );
        return await response.json();
      } else {
        // Create new panel
        const response = await apiRequest(
          "POST",
          "/api/lab/tests-catalog",
          data
        );
        return await response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: editingPanel ? "Panel updated" : "Panel created",
        description: editingPanel
          ? "The custom lab panel has been updated."
          : "A new custom lab panel has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/tests-catalog"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedTests([]);
      if (onPanelCreated) {
        onPanelCreated();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingPanel ? "update" : "create"} custom panel: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CustomPanel) => {
    // Ensure panelTestIds is set properly
    const formattedData = {
      ...data,
      isPanel: true,
      panelTestIds: selectedTests,
      testCode: `PANEL-${Date.now().toString().slice(-6)}`, // Generate a unique code
    };
    panelMutation.mutate(formattedData);
  };

  // Toggle a test selection
  const toggleTestSelection = (testId: number) => {
    setSelectedTests((current) => {
      if (current.includes(testId)) {
        return current.filter((id) => id !== testId);
      } else {
        return [...current, testId];
      }
    });
  };

  // Filter available tests based on search term
  const filteredTests = availableTests?.filter((test: any) => {
    // Exclude tests that are already panels to prevent nested panels
    if (test.isPanel) return false;
    
    return !searchTerm || 
      test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {editingPanel ? "Edit Panel" : "Create Custom Panel"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingPanel ? "Edit Custom Lab Panel" : "Create Custom Lab Panel"}
            </DialogTitle>
            <DialogDescription>
              Custom panels allow you to group multiple lab tests into a single order item.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-10rem)]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="testName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Panel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Comprehensive Health Panel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="panel">Panel</SelectItem>
                            <SelectItem value="blood_chemistry">Blood Chemistry</SelectItem>
                            <SelectItem value="hematology">Hematology</SelectItem>
                            <SelectItem value="urinalysis">Urinalysis</SelectItem>
                            <SelectItem value="endocrinology">Endocrinology</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this panel tests for and when it should be used"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in_house">In-House</SelectItem>
                            <SelectItem value="idexx">IDEXX</SelectItem>
                            <SelectItem value="antech">Antech</SelectItem>
                            <SelectItem value="zoetis">Zoetis</SelectItem>
                            <SelectItem value="heska">Heska</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormDescription>Leave blank to calculate from component tests</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Special instructions for sample collection"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />

                <div>
                  <h3 className="text-lg font-medium mb-4">Select Tests to Include in Panel</h3>
                  <Input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-4"
                  />

                  <FormField
                    control={form.control}
                    name="panelTestIds"
                    render={() => (
                      <FormItem>
                        <div className="border rounded-md">
                          {isLoadingTests ? (
                            <div className="flex justify-center items-center h-40">
                              <Loader2 className="h-8 w-8 animate-spin text-border" />
                            </div>
                          ) : testsError ? (
                            <div className="p-4 text-red-500">
                              <AlertCircle className="h-4 w-4 mr-2 inline" />
                              Error loading tests: {(testsError as Error).message}
                            </div>
                          ) : filteredTests?.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              No tests found matching your search criteria
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12"></TableHead>
                                  <TableHead>Test Name</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Provider</TableHead>
                                  <TableHead>Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredTests?.map((test: any) => (
                                  <TableRow key={test.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedTests.includes(test.id)}
                                        onCheckedChange={() => toggleTestSelection(test.id)}
                                      />
                                    </TableCell>
                                    <TableCell>{test.testName}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {test.category.replace('_', ' ')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{test.provider}</TableCell>
                                    <TableCell>{test.price ? `$${test.price}` : 'N/A'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                        {selectedTests.length === 0 && (
                          <FormMessage>At least one test must be selected</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  {selectedTests.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {selectedTests.length} tests selected
                    </div>
                  )}
                </div>
              </form>
            </Form>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={panelMutation.isPending || selectedTests.length === 0}
            >
              {panelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingPanel ? "Update Panel" : "Create Panel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}