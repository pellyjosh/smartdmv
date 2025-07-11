import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useParams, useLocation, useRoute } from 'next/link';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { usePractice } from '@/hooks/use-practice';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Define schema for invoice
const invoiceFormSchema = z.object({
  practiceId: z.number(),
  clientId: z.number().min(1, { message: "Client is required" }),
  petId: z.number().min(1, { message: "Pet is required" }),
  invoiceDate: z.date(),
  dueDate: z.date(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, { message: "Description is required" }),
    quantity: z.string().min(1, { message: "Quantity is required" }),
    serviceCode: z.string().optional(),
    unitPrice: z.string().min(1, { message: "Unit price is required" }),
    taxable: z.boolean().default(true),
    discount: z.string().optional()
  })).min(1, { message: "At least one item is required" })
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const InvoicePage = () => {
  const params = useParams();
  const [, navigate] = useLocation();
  const [match] = useRoute("/billing/invoice/new");
  const { toast } = useToast();
  const { practice } = usePractice();
  const practiceId = practice?.id;
  
  const isNew = match || params?.id === 'new';
  const invoiceId = isNew ? null : Number(params?.id);

  // Queries
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/users/clients'],
    enabled: !!practiceId
  });

  const { data: taxRates, isLoading: isLoadingTaxRates } = useQuery({
    queryKey: ['/api/practices', practiceId, 'tax-rates'],
    enabled: !!practiceId
  });

  const { data: serviceCodes, isLoading: isLoadingServiceCodes } = useQuery({
    queryKey: ['/api/practices', practiceId, 'service-codes'],
    enabled: !!practiceId
  });

  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !isNew && !!invoiceId
  });

  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [pets, setPets] = useState<any[]>([]);

  // Get pets for selected client
  const { data: clientPets } = useQuery({
    queryKey: ['/api/users', selectedClient, 'pets'],
    enabled: !!selectedClient
  });

  useEffect(() => {
    if (clientPets) {
      setPets(clientPets);
    }
  }, [clientPets]);

  // Form setup
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      practiceId: practiceId || 0,
      clientId: 0,
      petId: 0,
      invoiceDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
      notes: '',
      items: [
        {
          description: '',
          quantity: '1',
          serviceCode: '',
          unitPrice: '0.00',
          taxable: true,
          discount: '0.00'
        }
      ]
    }
  });

  // Update form when invoice data is loaded
  useEffect(() => {
    if (invoice && !isNew) {
      const formattedItems = invoice.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        serviceCode: item.serviceCode || '',
        unitPrice: (parseFloat(item.subtotal) / parseFloat(item.quantity)).toFixed(2),
        taxable: item.taxAmount ? true : false,
        discount: item.discountAmount || '0.00'
      }));

      form.reset({
        practiceId: invoice.practiceId,
        clientId: invoice.clientId,
        petId: invoice.petId,
        invoiceDate: new Date(invoice.date),
        dueDate: new Date(invoice.dueDate),
        notes: invoice.notes || '',
        items: formattedItems
      });

      setSelectedClient(invoice.clientId);
    }
  }, [invoice, isNew, form]);

  // Update practiceId when it changes
  useEffect(() => {
    if (practiceId) {
      form.setValue('practiceId', practiceId);
    }
  }, [practiceId, form]);

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const formatted = {
        ...data,
        date: format(data.invoiceDate, 'yyyy-MM-dd'),
        dueDate: format(data.dueDate, 'yyyy-MM-dd'),
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          serviceCode: item.serviceCode || null,
          subtotal: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2),
          taxable: item.taxable,
          discountAmount: item.discount || '0.00'
        }))
      };
      
      const res = await apiRequest('POST', '/api/invoices', formatted);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "The invoice has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      navigate('/billing');
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const formatted = {
        ...data,
        date: format(data.invoiceDate, 'yyyy-MM-dd'),
        dueDate: format(data.dueDate, 'yyyy-MM-dd'),
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          serviceCode: item.serviceCode || null,
          subtotal: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2),
          taxable: item.taxable,
          discountAmount: item.discount || '0.00'
        }))
      };
      
      const res = await apiRequest('PUT', `/api/invoices/${invoiceId}`, formatted);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated",
        description: "The invoice has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      navigate('/billing');
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form handlers
  const onSubmit = (values: InvoiceFormValues) => {
    if (isNew) {
      createInvoiceMutation.mutate(values);
    } else {
      updateInvoiceMutation.mutate(values);
    }
  };

  // Add item to invoice
  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems,
      {
        description: '',
        quantity: '1',
        serviceCode: '',
        unitPrice: '0.00',
        taxable: true,
        discount: '0.00'
      }
    ]);
  };

  // Remove item from invoice
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items') || [];
    if (currentItems.length > 1) {
      form.setValue('items', currentItems.filter((_, i) => i !== index));
    } else {
      toast({
        title: "Cannot remove item",
        description: "An invoice must have at least one item.",
        variant: "destructive",
      });
    }
  };

  // Handle client change
  const handleClientChange = (clientId: string) => {
    const id = parseInt(clientId);
    setSelectedClient(id);
    form.setValue('clientId', id);
    form.setValue('petId', 0); // Reset pet when client changes
  };

  // Apply service code
  const applyServiceCode = (index: number, codeId: string) => {
    const code = serviceCodes?.find((c: any) => c.id.toString() === codeId);
    if (code) {
      const currentItems = form.getValues('items');
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        description: code.description,
        unitPrice: code.defaultPrice,
        taxable: code.taxable,
        serviceCode: code.code
      };
      form.setValue('items', updatedItems);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const items = form.getValues('items') || [];
    
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      const discount = parseFloat(item.discount || '0.00');
      return sum + (lineTotal - discount);
    }, 0);
    
    const taxableAmount = items.reduce((sum, item) => {
      if (item.taxable) {
        const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        const discount = parseFloat(item.discount || '0.00');
        return sum + (lineTotal - discount);
      }
      return sum;
    }, 0);
    
    // Use default tax rate of 8% if no tax rate is selected
    const taxRate = 0.08;
    const taxAmount = taxableAmount * taxRate;
    
    const total = subtotal + taxAmount;
    
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const isLoading = isLoadingClients || isLoadingTaxRates || isLoadingServiceCodes || isLoadingInvoice;
  const isSaving = createInvoiceMutation.isPending || updateInvoiceMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'New Invoice' : 'Edit Invoice'}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Enter the basic information for this invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={handleClientChange}
                        disabled={isSaving || !isNew} // Can't change client on existing invoice
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
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
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => form.setValue('petId', parseInt(value))}
                        disabled={isSaving || !selectedClient || !isNew} // Can't change pet on existing invoice
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pets?.map((pet: any) => (
                            <SelectItem key={pet.id} value={pet.id.toString()}>
                              {pet.name} ({pet.species})
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
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Invoice Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal`}
                              disabled={isSaving}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal`}
                              disabled={isSaving}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any notes for this invoice"
                        className="resize-none"
                        {...field}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Invoice Items</CardTitle>
                  <CardDescription>Add the items to be billed on this invoice</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addItem}
                  size="sm"
                  className="gap-2"
                  disabled={isSaving}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Service Code</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.getValues().items?.map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input
                                  placeholder="Item description"
                                  {...field}
                                  disabled={isSaving}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Qty"
                                  {...field}
                                  disabled={isSaving}
                                  className="w-20"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.serviceCode`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <Select
                                value={field.value || "none"}
                                onValueChange={(value) => {
                                  field.onChange(value === "none" ? "" : value);
                                  if (value !== "none") {
                                    applyServiceCode(index, value);
                                  }
                                }}
                                disabled={isSaving}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Select code" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {serviceCodes?.map((code: any) => (
                                    <SelectItem key={code.id} value={code.id.toString()}>
                                      {code.code} - ${parseFloat(code.defaultPrice).toFixed(2)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5">$</span>
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    disabled={isSaving}
                                    className="pl-7 w-24"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.taxable`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Select
                                  value={field.value ? "yes" : "no"}
                                  onValueChange={(value) => field.onChange(value === "yes")}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className="w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.discount`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    disabled={isSaving}
                                    className="pl-7 w-24"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(() => {
                          const item = form.getValues().items[index];
                          const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
                          const discount = parseFloat(item.discount || '0.00');
                          return (lineTotal - discount).toFixed(2);
                        })()}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-2 flex flex-col items-end">
                <div className="flex w-64 justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex w-64 justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>${taxAmount}</span>
                </div>
                <Separator className="my-2 w-64" />
                <div className="flex w-64 justify-between font-bold">
                  <span>Total:</span>
                  <span>${total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/billing')}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? 'Create Invoice' : 'Update Invoice'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default InvoicePage;