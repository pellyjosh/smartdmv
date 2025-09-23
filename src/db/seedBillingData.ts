// Seed script to create sample billing data
import { db } from './index';
import { invoices, invoiceItems, payments, users, practices, pets } from './schema';
import { eq } from 'drizzle-orm';

export async function seedBillingData() {
  try {
    console.log('Seeding billing data...');

    // Find a client user and practice
    const client = await db.query.users.findFirst({
      where: eq(users.role, 'CLIENT'),
    });

    if (!client) {
      console.log('No CLIENT user found, cannot seed billing data');
      return;
    }

    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, client.practiceId!),
    });

    if (!practice) {
      console.log('No practice found for client, cannot seed billing data');
      return;
    }

    // Find a pet for this client
    const pet = await db.query.pets.findFirst({
      where: eq(pets.ownerId, client.id),
    });

    console.log(`Found client: ${client.name} (ID: ${client.id})`);
    console.log(`Found practice: ${practice.name} (ID: ${practice.id})`);
    if (pet) {
      console.log(`Found pet: ${pet.name} (ID: ${pet.id})`);
    }

    // Create sample invoices
    const sampleInvoices = [
      {
        practiceId: practice.id,
        clientId: client.id,
        petId: pet?.id || null,
        invoiceNumber: `INV-${new Date().getFullYear()}-001`,
        description: 'Annual wellness exam and vaccinations',
        subtotal: '125.50',
        taxAmount: '10.04',
        totalAmount: '135.54',
        status: 'pending' as const,
        issueDate: new Date('2025-01-15'),
        dueDate: new Date('2025-02-15'),
      },
      {
        practiceId: practice.id,
        clientId: client.id,
        petId: pet?.id || null,
        invoiceNumber: `INV-${new Date().getFullYear()}-002`,
        description: 'Dental cleaning and x-rays',
        subtotal: '89.00',
        taxAmount: '7.12',
        totalAmount: '96.12',
        status: 'paid' as const,
        issueDate: new Date('2024-12-20'),
        dueDate: new Date('2025-01-20'),
        paidDate: new Date('2025-01-16'),
      },
      {
        practiceId: practice.id,
        clientId: client.id,
        petId: pet?.id || null,
        invoiceNumber: `INV-${new Date().getFullYear()}-003`,
        description: 'Emergency visit for stomach issues',
        subtotal: '245.75',
        taxAmount: '19.66',
        totalAmount: '265.41',
        status: 'overdue' as const,
        issueDate: new Date('2024-11-15'),
        dueDate: new Date('2024-12-15'),
      },
    ];

    // Insert invoices
    const createdInvoices = await db.insert(invoices).values(sampleInvoices).returning();
    console.log(`Created ${createdInvoices.length} sample invoices`);

    // Create invoice items for each invoice
    const invoiceItemsData = [
      // Items for first invoice (Annual wellness)
      {
        invoiceId: createdInvoices[0].id,
        description: 'Annual Wellness Exam',
        quantity: '1',
        unitPrice: '85.00',
        subtotal: '85.00',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
      {
        invoiceId: createdInvoices[0].id,
        description: 'Vaccinations (DHPP, Rabies)',
        quantity: '1',
        unitPrice: '40.50',
        subtotal: '40.50',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
      // Items for second invoice (Dental)
      {
        invoiceId: createdInvoices[1].id,
        description: 'Dental Cleaning',
        quantity: '1',
        unitPrice: '75.00',
        subtotal: '75.00',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
      {
        invoiceId: createdInvoices[1].id,
        description: 'Dental X-rays',
        quantity: '1',
        unitPrice: '14.00',
        subtotal: '14.00',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
      // Items for third invoice (Emergency)
      {
        invoiceId: createdInvoices[2].id,
        description: 'Emergency Visit',
        quantity: '1',
        unitPrice: '150.00',
        subtotal: '150.00',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
      {
        invoiceId: createdInvoices[2].id,
        description: 'Blood Work Panel',
        quantity: '1',
        unitPrice: '65.75',
        subtotal: '65.75',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
      {
        invoiceId: createdInvoices[2].id,
        description: 'Medications',
        quantity: '1',
        unitPrice: '30.00',
        subtotal: '30.00',
        discountAmount: '0.00',
        taxable: 'yes' as const,
      },
    ];

    const createdItems = await db.insert(invoiceItems).values(invoiceItemsData).returning();
    console.log(`Created ${createdItems.length} invoice items`);

    // Create a sample payment for the paid invoice
    const paymentData = {
      practiceId: practice.id,
      invoiceId: createdInvoices[1].id, // Paid invoice
      clientId: client.id,
      paymentNumber: `PAY-${new Date().getFullYear()}-0001`,
      amount: '96.12',
      paymentMethod: 'credit_card' as const,
      transactionId: 'mock_txn_123456789',
      processorResponse: JSON.stringify({
        status: 'success',
        transaction_id: 'mock_txn_123456789',
        amount: 96.12,
        currency: 'USD',
        timestamp: '2025-01-16T10:30:00Z',
      }),
      status: 'completed' as const,
      paymentDate: new Date('2025-01-16'),
      notes: 'Payment processed via credit card',
    };

    const createdPayment = await db.insert(payments).values(paymentData).returning();
    console.log(`Created 1 sample payment`);

    console.log('Billing data seeding completed successfully!');
    console.log('You can now test the billing functionality with:');
    console.log(`- Client ID: ${client.id}`);
    console.log(`- Practice ID: ${practice.id}`);
    if (pet) {
      console.log(`- Pet ID: ${pet.id}`);
    }

  } catch (error) {
    console.error('Error seeding billing data:', error);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedBillingData().then(() => process.exit(0));
}
