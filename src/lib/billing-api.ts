// API utilities for billing functionality
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for billing data
export interface Invoice {
  id: number;
  invoiceNumber: string;
  description: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  status: 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  pet?: {
    name: string;
  };
  items: InvoiceItem[];
  payments: Payment[];
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  discountAmount: string;
  taxable: 'yes' | 'no';
}

export interface Payment {
  id: number;
  paymentNumber: string;
  amount: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  notes?: string;
  invoice?: {
    invoiceNumber: string;
    description: string;
  };
}

export interface PaymentMethod {
  id: number;
  type: string;
  lastFourDigits: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardBrand?: string;
  billingName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  isDefault: 'yes' | 'no';
  createdAt: string;
}

// API functions
export const billingApi = {
  // Get invoices
  getInvoices: async (status?: string): Promise<Invoice[]> => {
    const url = status ? `/api/billing/invoices?status=${status}` : '/api/billing/invoices';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    return response.json();
  },

  // Get payments
  getPayments: async (status?: string): Promise<Payment[]> => {
    const url = status ? `/api/billing/payments?status=${status}` : '/api/billing/payments';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }
    return response.json();
  },

  // Get payment methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await fetch('/api/billing/payment-methods');
    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }
    return response.json();
  },

  // Process payment
  processPayment: async (paymentData: {
    invoiceId: number;
    amount: number;
    paymentMethod: string;
    cardDetails?: {
      cardNumber: string;
      expiryDate: string;
      cvv: string;
      nameOnCard: string;
    };
    notes?: string;
  }) => {
    const response = await fetch('/api/billing/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process payment');
    }
    return response.json();
  },

  // Add payment method
  addPaymentMethod: async (paymentMethodData: {
    type: string;
    cardNumber: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardBrand?: string;
    billingName: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingZip?: string;
    billingCountry?: string;
    isDefault?: boolean;
  }) => {
    const response = await fetch('/api/billing/payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentMethodData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add payment method');
    }
    return response.json();
  },

  // Delete payment method
  deletePaymentMethod: async (paymentMethodId: number) => {
    const response = await fetch(`/api/billing/payment-methods?id=${paymentMethodId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete payment method');
    }
    return response.json();
  },

  // Set payment method as primary
  setPrimaryPaymentMethod: async (paymentMethodId: number) => {
    const response = await fetch(`/api/billing/payment-methods?id=${paymentMethodId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set primary payment method');
    }
    return response.json();
  },
};

// React Query hooks
export const useBillingData = () => {
  const queryClient = useQueryClient();

  // Get invoices
  const useInvoices = (status?: string) => {
    return useQuery({
      queryKey: ['invoices', status],
      queryFn: () => billingApi.getInvoices(status),
    });
  };

  // Get payments
  const usePayments = (status?: string) => {
    return useQuery({
      queryKey: ['payments', status],
      queryFn: () => billingApi.getPayments(status),
    });
  };

  // Get payment methods
  const usePaymentMethods = () => {
    return useQuery({
      queryKey: ['payment-methods'],
      queryFn: billingApi.getPaymentMethods,
    });
  };

  // Process payment mutation
  const useProcessPayment = () => {
    return useMutation({
      mutationFn: billingApi.processPayment,
      onSuccess: () => {
        // Invalidate and refetch billing data
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      },
    });
  };

  // Add payment method mutation
  const useAddPaymentMethod = () => {
    return useMutation({
      mutationFn: billingApi.addPaymentMethod,
      onSuccess: () => {
        // Invalidate and refetch payment methods
        queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      },
    });
  };

  // Delete payment method mutation
  const useDeletePaymentMethod = () => {
    return useMutation({
      mutationFn: billingApi.deletePaymentMethod,
      onSuccess: () => {
        // Invalidate and refetch payment methods
        queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      },
    });
  };

  // Set primary payment method mutation
  const useSetPrimaryPaymentMethod = () => {
    return useMutation({
      mutationFn: billingApi.setPrimaryPaymentMethod,
      onSuccess: () => {
        // Invalidate and refetch payment methods
        queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      },
    });
  };

  return {
    useInvoices,
    usePayments,
    usePaymentMethods,
    useProcessPayment,
    useAddPaymentMethod,
    useDeletePaymentMethod,
    useSetPrimaryPaymentMethod,
  };
};
