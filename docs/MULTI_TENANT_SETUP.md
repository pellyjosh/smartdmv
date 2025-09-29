# Multi-Tenant Database Architecture Setup Guide

This guide walks you through setting up the complete multi-tenant architecture with separate databases and file storage for each tenant.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Owner DB      │    │   Tenant DB 1   │    │   Tenant DB N   │
│                 │    │                 │    │                 │
│ • tenants       │    │ • users         │    │ • users         │
│ • domains       │    │ • practices     │    │ • practices     │
│ • subscriptions │    │ • patients      │    │ • patients      │
│ • usage         │    │ • appointments  │    │ • appointments  │
│ • owner_users   │    │ • medical_rec   │    │ • medical_rec   │
│                 │    │ • prescriptions │    │ • prescriptions │
│                 │    │ • inventory     │    │ • inventory     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

1. PostgreSQL server running
2. Node.js and npm/yarn installed
3. Environment variables configured

## Environment Variables

Create or update your `.env.local` file:

```bash
# Owner Database (Super Admin Database)
OWNER_DATABASE_URL="postgresql://username:password@localhost:5432/smartdmv_owner"

# Default Tenant Database (fallback/first tenant)
DATABASE_URL="postgresql://username:password@localhost:5432/smartdmv_tenant_default"

# PostgreSQL Admin Credentials (for creating new databases)
PGUSER="postgres"
PGPASSWORD="your_admin_password"

# Other required variables
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Setup Steps

### 1. Create Owner Database

First, create the owner database manually in PostgreSQL:

```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create owner database
CREATE DATABASE smartdmv_owner;

-- Create default tenant database
CREATE DATABASE smartdmv_tenant_default;
```

### 2. Run Owner Database Setup

This will create all owner tables and default configurations:

```bash
npx tsx scripts/add-tenant-support.ts
```

This script will:

- Create owner tables (tenants, domains, subscriptions, etc.)
- Insert default subscription plans
- Create a default tenant pointing to your current database
- Set up proper indexes and constraints

### 3. Migrate Existing Data (if applicable)

If you have existing data in a single database that you want to migrate to the new architecture:

```bash
# This will move existing users/practices to the default tenant
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### 4. Test the Setup

1. Start your Next.js application:

```bash
npm run dev
```

2. Visit the owner dashboard:

```bash
http://localhost:3000/owner
```

3. Create a test tenant through the owner dashboard

## File Storage Structure

The system automatically creates this directory structure:

```
storage/
├── tenants/
│   ├── default/              # Default tenant files
│   │   ├── practices/
│   │   ├── medical-imaging/
│   │   ├── documents/
│   │   ├── uploads/
│   │   └── backups/
│   ├── tenant1/              # First created tenant
│   │   ├── practices/
│   │   ├── medical-imaging/
│   │   └── ...
│   └── tenant2/              # Second created tenant
│       └── ...
```

## Database Schema

### Owner Database Tables

- **tenants**: Master list of all tenants with database connection info
- **tenant_domains**: Domain mappings for each tenant
- **subscription_plans**: Available subscription tiers
- **tenant_subscriptions**: Active subscriptions per tenant
- **tenant_usage**: Usage tracking and billing data
- **owner_users**: Super admin user accounts
- **owner_sessions**: Admin session management
- **system_settings**: Global system configuration

### Tenant Database Tables

Each tenant gets a complete copy of business tables:

- **users**: Tenant-specific user accounts
- **sessions**: User session management
- **practices**: Medical practices within the tenant
- **user_practices**: User-practice relationships
- **patients**: Patient records
- **appointments**: Appointment scheduling
- **medical_records**: Patient medical history
- **prescriptions**: Prescription management
- **inventory**: Practice inventory tracking

## API Architecture

### Owner APIs (`/api/owner/*`)

- Use `ownerDb` connection
- Manage tenants, subscriptions, and system-wide operations
- Only accessible to owner/admin users

### Tenant APIs (`/api/*`)

- Use tenant-specific database connection via `getTenantDatabase()`
- Handle all business operations for the specific tenant
- Automatically isolated per tenant

## Tenant Creation Flow

When a new tenant is created:

1. **Owner Dashboard**: Admin creates tenant via `/owner` interface
2. **API Call**: POST to `/api/owner/tenants`
3. **Database Creation**: New PostgreSQL database is created automatically
4. **Schema Setup**: All business tables are created in new tenant DB
5. **File Storage**: Tenant-specific directories are created
6. **Status Update**: Tenant status is set to 'ACTIVE'

## Security Considerations

1. **Database Isolation**: Each tenant has completely separate database
2. **File Isolation**: Each tenant has dedicated file storage directory
3. **API Isolation**: Middleware ensures users can only access their tenant data
4. **Owner Access**: Only owner users can access cross-tenant data

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Verify environment variables are set correctly
   - Ensure PostgreSQL is running
   - Check database user permissions

2. **Tenant Creation Fails**

   - Check PostgreSQL admin credentials
   - Verify disk space for new database
   - Review logs for specific error messages

3. **File Storage Issues**
   - Ensure application has write permissions to storage directory
   - Check available disk space

### Useful Commands

```bash
# Check owner database connection
npx tsx -e "import { ownerDb } from './src/db/owner-db.config'; console.log(await ownerDb.select().from(tenants))"

# Check tenant database connection
npx tsx -e "import { getTenantDatabase } from './src/lib/tenant-context'; const db = await getTenantDatabase('default'); console.log('Connected to tenant DB')"

# Create tenant database manually
npx tsx scripts/create-tenant-database.ts <tenant-id>

# List all tenant databases
psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'smartdmv%' OR datname LIKE 'tenant_%';"
```

## Next Steps

1. Set up automated backups for each tenant database
2. Implement tenant usage monitoring and billing
3. Add tenant-specific customizations and branding
4. Set up monitoring and logging for multi-database architecture
5. Consider database scaling strategies as tenant count grows

## Production Considerations

1. **Database Server**: Consider separate database servers for large tenant counts
2. **Connection Pooling**: Implement proper connection pooling for each tenant database
3. **Monitoring**: Set up monitoring for each tenant database
4. **Backups**: Automated backup strategy for all tenant databases
5. **Performance**: Monitor query performance across tenant databases
6. **Scaling**: Plan for horizontal scaling of tenant databases

This architecture provides complete tenant isolation while maintaining a clean separation between owner management and tenant operations.
