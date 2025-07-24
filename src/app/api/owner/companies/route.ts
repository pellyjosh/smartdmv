// src/app/api/owner/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ownerDb, companies, companyDatabases } from '@/owner/db/config';
import { eq } from 'drizzle-orm';
import { createCompanyDatabase } from '@/tenant/db-manager';

// GET /api/owner/companies - List all companies
export async function GET() {
  try {
    const allCompanies = await ownerDb.select().from(companies);
    return NextResponse.json(allCompanies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/owner/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country = 'US',
      databaseUrl, // Connection string for the company's database
    } = body;

    // Validate required fields
    if (!name || !subdomain || !contactEmail || !databaseUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subdomain, contactEmail, databaseUrl' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingCompany = await ownerDb
      .select()
      .from(companies)
      .where(eq(companies.subdomain, subdomain))
      .limit(1);

    if (existingCompany.length > 0) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Create company
    const [newCompany] = await ownerDb.insert(companies).values({
      name,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country,
      isActive: true,
      subscriptionStatus: 'trial',
    }).returning();

    // Create database configuration
    await createCompanyDatabase(
      newCompany.id,
      `${subdomain}_db`,
      databaseUrl
    );

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
