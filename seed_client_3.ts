import { db } from './src/db/index.js';
import { invoices, invoiceItems, payments, paymentMethods } from './src/db/schema.js';

async function seedClient3() {
  console.log('Creating billing data for client ID 3...');

  try {
  // Create invoice
  const [invoice] = await db.insert(invoices).values({
    practiceId: 1,
    clientId: 3,
    petId: null,
    appointmentId: null,
    invoiceNumber: 'INV-2025-CLIENT3-001',
    description: 'Veterinary Consultation and Treatment',
    subtotal: '150.00',
    taxAmount: '15.00',
    discountAmount: '0.00',
    totalAmount: '165.00',
    status: 'pending',
    issueDate: new Date('2025-09-15'),
    dueDate: new Date('2025-10-15'),
  }).returning();

  console.log('Created invoice:', invoice.id);

  // Create invoice items
  await db.insert(invoiceItems).values([
    {
      invoiceId: invoice.id,
      treatmentId: null,
      description: 'General Health Check',
      quantity: '1',
      unitPrice: '75.00',
      subtotal: '75.00',
      discountAmount: '0.00',
      taxable: 'yes',
    },
    {
      invoiceId: invoice.id,
      treatmentId: null,
      description: 'Vaccination Update',
      quantity: '1',
      unitPrice: '75.00',
      subtotal: '75.00',
      discountAmount: '0.00',
      taxable: 'yes',
    },
  ]);

  // Create payment
  const [payment] = await db.insert(payments).values({
    practiceId: 1,
    invoiceId: invoice.id,
    clientId: 3,
    paymentNumber: 'PAY-2025-CLIENT3-001',
    amount: '50.00',
    paymentMethod: 'credit_card',
    transactionId: 'txn_1234567890',
    processorResponse: 'approved',
    status: 'completed',
    paymentDate: new Date('2025-09-16'),
    notes: 'Partial payment',
  }).returning();

  console.log('Created payment:', payment.id);

  // Create payment method
  const [paymentMethod] = await db.insert(paymentMethods).values({
    clientId: 3,
    type: 'credit_card',
    lastFourDigits: '4567',
    expiryMonth: '12',
    expiryYear: '2027',
    cardBrand: 'Visa',
    billingName: 'Client User',
    billingAddress: '123 Client St',
    billingCity: 'Client City',
    billingState: 'CC',
    billingZip: '12345',
    billingCountry: 'US',
    isDefault: 'yes',
    isActive: 'yes',
  }).returning();

  console.log('Created payment method:', paymentMethod.id);
  console.log('✅ Successfully created billing data for client ID 3');
} catch (error) {
  console.error('Error creating billing data:', error);
} finally {
  process.exit(0);
}
}

seedClient3();
