"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePractice } from "@/hooks/use-practice";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Schema
const invoiceFormSchema = z.object({
  practiceId: z.number(),
  clientId: z.number().min(1, { message: "Client is required" }),
  petId: z.number().min(1, { message: "Pet is required" }),
  invoiceDate: z.date(),
  dueDate: z.date(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, { message: "Description is required" }),
        quantity: z.string().min(1, { message: "Quantity is required" }),
        serviceCode: z.string().optional(),
        unitPrice: z.string().min(1, { message: "Unit price is required" }),
        taxable: z.boolean().default(true),
        discount: z.string().optional(),
      })
    )
    .min(1, { message: "At least one item is required" }),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
interface InvoiceItem {
  itemType?: string;
  description: string;
  quantity: string;
  serviceCode?: string;
  productId?: string;
  unitPrice: string;
  taxable: boolean;
  discount?: string;
}

const NewInvoicePage = () => {
  const { practice } = usePractice();
  const practiceId = practice?.id;
  const { format: formatCurrency, practiceCurrency } = useCurrencyFormatter();
  const currencySymbol = practiceCurrency?.symbol;
  const { toast } = useToast();
  const router = useRouter();

  // Queries
  const { data: clients = [] as any[], isLoading: isLoadingClients } = useQuery(
    {
      queryKey: ["/api/practices", practiceId, "clients"],
      queryFn: async () => {
        if (!practiceId) return [] as any[];
        const res = await apiRequest(
          "GET",
          `/api/practices/${practiceId}/clients`
        );
        if (!res.ok) throw new Error("Failed to fetch clients");
        return res.json();
      },
      enabled: !!practiceId,
    }
  );

  const { data: taxRates, isLoading: isLoadingTaxRates } = useQuery({
    queryKey: ["/api/practices", practiceId, "tax-rates"],
    queryFn: async () => {
      if (!practiceId) return [] as any[];
      const res = await apiRequest(
        "GET",
        `/api/practices/${practiceId}/tax-rates`
      );
      if (!res.ok) throw new Error("Failed to fetch tax rates");
      return res.json();
    },
    enabled: !!practiceId,
  });

  const { data: serviceCodes = [] as any[], isLoading: isLoadingServiceCodes } =
    useQuery({
      queryKey: ["/api/practices", practiceId, "service-codes"],
      queryFn: async () => {
        if (!practiceId) return [] as any[];
        const res = await apiRequest(
          "GET",
          `/api/practices/${practiceId}/service-codes`
        );
        if (!res.ok) throw new Error("Failed to fetch service codes");
        return res.json();
      },
      enabled: !!practiceId,
    });

  // Fetch inventory items (products)
  const { data: inventoryItems, isLoading: isLoadingInventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Check if practice has default currency configured
  const { data: practiceDetails } = useQuery({
    queryKey: ["/api/practices", practiceId],
    queryFn: async () => {
      if (!practiceId) return null;
      const res = await apiRequest("GET", `/api/practices/${practiceId}`);
      if (!res.ok) throw new Error("Failed to fetch practice details");
      return res.json();
    },
    enabled: !!practiceId,
  });

  const hasDefaultCurrency = (practiceDetails as any)?.defaultCurrencyId;

  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [pets, setPets] = useState<any[]>([]);

  const { data: clientPets, isLoading: isLoadingPets } = useQuery<any[]>({
    queryKey: ["/api/pets", selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [] as any[];
      const res = await apiRequest(
        "GET",
        `/api/pets?clientId=${selectedClient}`
      );
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
    enabled: !!selectedClient,
  });

  useEffect(() => {
    if (clientPets) setPets(clientPets as any[]);
  }, [clientPets]);

  // Form
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      practiceId: practiceId || 0,
      clientId: 0,
      petId: 0,
      invoiceDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      notes: "",
      items: [
        {
          itemType: "manual",
          description: "",
          quantity: "1",
          serviceCode: "",
          productId: "",
          unitPrice: "0.00",
          taxable: true,
          discount: "0.00",
        },
      ],
    },
  });

  // Field array for performant dynamic item rows
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const watchedItems = form.watch("items");

  useEffect(() => {
    if (practiceId) form.setValue("practiceId", practiceId);
  }, [practiceId, form]);

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const items: InvoiceItem[] = (data.items || []) as any;
      const formatted: any = {
        ...data,
        date: format(data.invoiceDate as Date, "yyyy-MM-dd"),
        dueDate: format(data.dueDate as Date, "yyyy-MM-dd"),
        items: items.map((item: InvoiceItem) => ({
          description: item.description,
          quantity: item.quantity,
          serviceCode: item.serviceCode || null,
          subtotal: (
            parseFloat(item.quantity) * parseFloat(item.unitPrice)
          ).toFixed(2),
          taxable: item.taxable,
          discountAmount: item.discount || "0.00",
        })),
      };
      // Use practice scoped endpoint
      const res = await apiRequest(
        "POST",
        `/api/practices/${practiceId}/invoices`,
        formatted
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "The invoice has been created successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/practices", practiceId, "invoices"],
      });
      router.push("/admin/billing");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating invoice",
        description: error.message || "Failed",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onSubmit = (values: InvoiceFormValues) =>
    createInvoiceMutation.mutate(values);

  const addItem = () => {
    append({
      itemType: "manual",
      description: "",
      quantity: "1",
      serviceCode: "",
      productId: "",
      unitPrice: "0.00",
      taxable: true,
      discount: "0.00",
    } as any);
  };
  const removeItem = (index: number) => {
    if (fields.length === 1) {
      toast({
        title: "Cannot remove item",
        description: "An invoice must have at least one item.",
        variant: "destructive",
      });
      return;
    }
    remove(index);
  };
  const handleClientChange = (val: string) => {
    const id = parseInt(val);
    setSelectedClient(id);
    form.setValue("clientId", id);
    form.setValue("petId", 0);
  };
  const applyServiceCode = (index: number, codeId: string) => {
    const code = (serviceCodes as any[])?.find(
      (c: any) => c.id.toString() === codeId
    );
    if (!code) return;
    const items = [
      ...((form.getValues("items") as InvoiceItem[]) || []),
    ] as InvoiceItem[];
    items[index] = {
      ...items[index],
      description: code.description,
      unitPrice: code.defaultPrice,
      taxable: code.taxable === "yes",
      serviceCode: codeId, // Store the ID instead of code string
    } as InvoiceItem;
    form.setValue("items", items as any);
  };

  const applyInventoryItem = (index: number, itemId: string) => {
    const inventoryItem = (inventoryItems as any[])?.find(
      (item: any) => item.id.toString() === itemId
    );
    if (!inventoryItem) return;
    const items = [
      ...((form.getValues("items") as InvoiceItem[]) || []),
    ] as InvoiceItem[];
    items[index] = {
      ...items[index],
      description:
        inventoryItem.name +
        (inventoryItem.description ? ` - ${inventoryItem.description}` : ""),
      unitPrice: inventoryItem.price || "0.00",
      taxable: true, // Most products are taxable
      productId: itemId, // Store the ID
    } as InvoiceItem;
    form.setValue("items", items as any);
  };

  const calculateTotals = React.useCallback(() => {
    const items: InvoiceItem[] = (watchedItems as InvoiceItem[]) || [];
    const subtotal = items.reduce(
      (s: number, it: InvoiceItem) =>
        s +
        ((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0) -
          (parseFloat(it.discount || "0") || 0)),
      0
    );
    const taxableAmount = items.reduce(
      (s: number, it: InvoiceItem) =>
        it.taxable
          ? s +
            ((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0) -
              (parseFloat(it.discount || "0") || 0))
          : s,
      0
    );
    const taxRate = 0.08;
    const taxAmount = taxableAmount * taxRate;
    const total = subtotal + taxAmount;
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    };
  }, [watchedItems]);
  const { subtotal, taxAmount, total } = calculateTotals();

  const isLoading =
    isLoadingClients ||
    isLoadingTaxRates ||
    isLoadingServiceCodes ||
    isLoadingInventory;
  const isSaving = createInvoiceMutation.isPending;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-28" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, row) => (
                  <div key={row} className="grid grid-cols-8 gap-4">
                    <Skeleton className="h-10 col-span-2" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2 flex flex-col items-end">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-48" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/billing")}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Invoice</h1>
      </div>

      {/* Currency Configuration Alert */}
      {!hasDefaultCurrency && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Currency Not Configured:</strong> Your practice doesn't
              have a default currency set. Please configure it in Practice
              Settings before creating invoices.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/practice-settings")}
              className="ml-4 gap-2"
            >
              <Settings className="h-4 w-4" />
              Go to Practice Settings
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>
                Enter the basic information for this invoice
              </CardDescription>
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
                        disabled={isSaving}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(clients as any[])?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
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
                        onValueChange={(v) =>
                          form.setValue("petId", parseInt(v))
                        }
                        disabled={isSaving || !selectedClient || isLoadingPets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingPets
                                  ? "Loading pets..."
                                  : !selectedClient
                                  ? "Select client first"
                                  : "Select a pet"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingPets && (
                            <SelectItem value="loading" disabled>
                              Loading pets...
                            </SelectItem>
                          )}
                          {!isLoadingPets &&
                            selectedClient &&
                            pets?.length === 0 && (
                              <SelectItem value="none" disabled>
                                No pets found
                              </SelectItem>
                            )}
                          {!isLoadingPets &&
                            pets?.map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} ({p.species})
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
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
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
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
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
                  <CardDescription>
                    Add the items to be billed on this invoice
                  </CardDescription>
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
                    <TableHead className="w-[180px]">Item Type</TableHead>
                    <TableHead className="w-[250px]">Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index: number) => {
                    const currentItem = watchedItems[index];
                    const itemTotal = (
                      parseFloat(currentItem?.quantity || "0") *
                        parseFloat(currentItem?.unitPrice || "0") -
                      parseFloat(currentItem?.discount || "0")
                    ).toFixed(2);

                    return (
                      <TableRow key={field.id} className="transition-opacity">
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.itemType`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <Select
                                  value={field.value || "manual"}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    if (value === "manual") {
                                      // Clear the item when switching to manual
                                      const items = [
                                        ...(form.getValues(
                                          "items"
                                        ) as InvoiceItem[]),
                                      ];
                                      items[index] = {
                                        ...items[index],
                                        description: "",
                                        unitPrice: "0.00",
                                        serviceCode: "",
                                        productId: "",
                                        taxable: true,
                                      };
                                      form.setValue("items", items as any);
                                    }
                                  }}
                                  disabled={isSaving}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="manual">
                                      Manual
                                    </SelectItem>
                                    <SelectItem value="service">
                                      Service
                                    </SelectItem>
                                    <SelectItem value="product">
                                      Product
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {currentItem?.itemType === "service" ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.serviceCode`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select
                                    value={field.value || "none"}
                                    onValueChange={(v) => {
                                      field.onChange(v === "none" ? "" : v);
                                      if (v !== "none")
                                        applyServiceCode(index, v);
                                    }}
                                    disabled={isSaving}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select service" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        Select service
                                      </SelectItem>
                                      {(serviceCodes as any[])?.map((code) => (
                                        <SelectItem
                                          key={code.id}
                                          value={code.id.toString()}
                                        >
                                          {code.code} - {code.description}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : currentItem?.itemType === "product" ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select
                                    value={field.value || "none"}
                                    onValueChange={(v) => {
                                      field.onChange(v === "none" ? "" : v);
                                      if (v !== "none")
                                        applyInventoryItem(index, v);
                                    }}
                                    disabled={isSaving}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select product" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        Select product
                                      </SelectItem>
                                      {(inventoryItems as any[])
                                        ?.filter(
                                          (item: any) =>
                                            parseFloat(item.quantity || "0") > 0
                                        )
                                        .map((item) => (
                                          <SelectItem
                                            key={item.id}
                                            value={item.id.toString()}
                                          >
                                            {item.name}
                                            {item.sku && ` (${item.sku})`}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      placeholder="Enter description"
                                      {...field}
                                      disabled={isSaving}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
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
                                    placeholder="1"
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
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5">
                                      {currencySymbol}
                                    </span>
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
                                    onValueChange={(v) =>
                                      field.onChange(v === "yes")
                                    }
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
                                    <span className="absolute left-3 top-2.5">
                                      {currencySymbol}
                                    </span>
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
                          {currencySymbol}
                          {itemTotal}
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={isSaving}
                              className="text-red-600 hover:text-red-700"
                            >
                              ×
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-6 space-y-2 flex flex-col items-end">
                <div className="flex w-64 justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>
                    {currencySymbol}
                    {subtotal}
                  </span>
                </div>
                <div className="flex w-64 justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>
                    {currencySymbol}
                    {taxAmount}
                  </span>
                </div>
                <Separator className="my-2 w-64" />
                <div className="flex w-64 justify-between font-bold">
                  <span>Total:</span>
                  <span>
                    {currencySymbol}
                    {total}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/billing")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewInvoicePage;
