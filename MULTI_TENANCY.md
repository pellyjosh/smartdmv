# Multi-Tenancy Implementation Guide

This document explains the multi-tenancy architecture implemented for the SmartDMV veterinary practice management system.

## Architecture Overview

The system now supports multiple veterinary practice companies, each with their own isolated database and data, while providing a centralized owner management interface.

### Key Components

1. **Owner Management System** (`/src/owner/`)

   - Centralized company management
   - Subscription and billing management
   - Platform-wide analytics
   - Owner/admin dashboard

2. **Tenant System** (`/src/tenant/`)

   - Company-specific database management
   - Multi-tenant routing and isolation
   - Backwards compatibility with existing code

3. **Database Architecture**
   - **Owner Database**: Stores companies, subscriptions, billing, and platform users
   - **Tenant Databases**: Separate database per company with veterinary practice data

## Directory Structure

```
src/
├── owner/                     # Owner management system
│   ├── db/
│   │   ├── schemas/           # Owner database schemas
│   │   ├── config.ts          # Owner DB connection
│   │   └── schema.ts          # Combined schema exports
│   ├── components/            # Owner UI components
│   └── lib/                   # Owner utilities
├── tenant/                    # Tenant management
│   └── db-manager.ts          # Multi-tenant DB connections
├── lib/
│   └── database-context.ts    # Contextual DB helper
├── app/
│   ├── (main)/owner/          # Owner dashboard pages
│   └── api/owner/             # Owner API routes
└── db/                        # Existing tenant schemas (unchanged)
    └── schema.ts              # Your existing veterinary schemas
```

## User Roles

### Platform Roles (Owner Database)

- **OWNER**: Platform owner with full access to all companies
- **COMPANY_ADMIN**: Manages a specific company's subscription and settings

### Tenant Roles (Company Database)

- **CLIENT**: Pet owners/clients
- **PRACTICE_ADMINISTRATOR**: Practice managers
- **ADMINISTRATOR**: Practice administrators with broader access
- **VETERINARIAN**: Veterinarians
- **PRACTICE_MANAGER**: Practice managers

## Setting Up Multi-Tenancy

### 1. Environment Variables

Add to your `.env` file:

```bash
# Owner database (can be the same as DATABASE_URL initially)
OWNER_DATABASE_URL=postgresql://...

# Default tenant database (your existing database)
DATABASE_URL=postgresql://...
```

### 2. Generate Owner Database Migrations

```bash
# Generate migrations for owner database
npx drizzle-kit generate --config=drizzle.owner.config.ts

# Run owner database migrations
npx drizzle-kit migrate --config=drizzle.owner.config.ts
```

### 3. Create Your First Company

After setting up the owner database, create your first company:

```bash
# POST /api/owner/companies
{
  "name": "ABC Veterinary Clinic",
  "subdomain": "abc-vet",
  "contactEmail": "admin@abc-vet.com",
  "contactPhone": "+1234567890",
  "databaseUrl": "postgresql://..." // Database URL for this company
}
```

## Migration Path

### For Existing Installations

1. **Backup your current database**
2. **Set up owner database** (can be the same instance initially)
3. **Run owner migrations**
4. **Create a company record** for your existing practice
5. **Update user records** to include `companyId`

### Code Changes Required

1. **Update API routes** to use `getContextualDb()` instead of direct database imports
2. **Add company context** to user sessions and middleware
3. **Update authentication** to include company information

## Usage Examples

### In API Routes

```typescript
// Before (single tenant)
import { db } from "@/db";

// After (multi-tenant)
import { getContextualDb } from "@/lib/database-context";

export async function GET() {
  const db = await getContextualDb(); // Gets the right DB based on context
  // ... rest of your code unchanged
}
```

### Accessing Owner Functions

```typescript
import { ownerDb, companies } from "@/owner/db/config";

// Manage companies, subscriptions, etc.
const allCompanies = await ownerDb.select().from(companies);
```

## Security Features

1. **Database Isolation**: Each company has its own database
2. **Role-based Access Control**: Users can only access their authorized areas
3. **Company Context Validation**: Middleware ensures users can only access their company's data
4. **Header-based Routing**: Company ID passed securely in request headers

## Routing

- `/owner/*` - Owner management interface
- `/client/*` - Client (pet owner) interface
- `/administrator/*` - Practice administrator interface
- `/practice-administrator/*` - Practice admin interface
- All existing routes continue to work for backwards compatibility

## API Endpoints

### Owner Management

- `GET /api/owner/companies` - List all companies
- `POST /api/owner/companies` - Create new company
- `GET /api/owner/companies/[id]` - Get company details
- `PUT /api/owner/companies/[id]` - Update company
- `DELETE /api/owner/companies/[id]` - Delete company

### Tenant APIs

All existing APIs continue to work and automatically use the correct tenant database based on the user's company context.

## Backwards Compatibility

The implementation maintains full backwards compatibility:

- Existing database schema unchanged
- Existing API routes continue to work
- Existing components and pages unchanged
- Gradual migration path available

## Next Steps

1. Set up the owner database
2. Create your first company record
3. Update user authentication to include company context
4. Test multi-tenant isolation
5. Implement billing and subscription management
6. Add company onboarding flows
