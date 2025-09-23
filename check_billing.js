import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const { invoices, payments, paymentMethods, users } = schema;

console.log('=== CHECKING BILLING DATA ===');

try {
  // Check invoices
  const allInvoices = await db.select().from(invoices).limit(10);
  console.log('Total invoices:', allInvoices.length);
  if (allInvoices.length > 0) {
    console.log('Sample invoice clientId:', allInvoices[0].clientId);
  }

  // Check payments
  const allPayments = await db.select().from(payments).limit(10);
  console.log('Total payments:', allPayments.length);
  if (allPayments.length > 0) {
    console.log('Sample payment clientId:', allPayments[0].clientId);
  }

  // Check payment methods
  const allPaymentMethods = await db.select().from(paymentMethods).limit(10);
  console.log('Total payment methods:', allPaymentMethods.length);
  if (allPaymentMethods.length > 0) {
    console.log('Sample payment method clientId:', allPaymentMethods[0].clientId);
  }

  // Check what clients we have
  const clients = await db.select().from(users).where(eq(users.role, 'CLIENT'));
  console.log('Available clients:', clients.map(c => ({ id: c.id, name: c.name, email: c.email })));
} catch (error) {
  console.error('Error:', error);
} finally {
  process.exit(0);
}
