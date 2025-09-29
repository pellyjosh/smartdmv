# SmartDMV Multi-Tenant System

This document describes the complete multi-tenant system implementation for SmartDMV.

## 🏗️ Architecture Overview

The multi-tenant system supports:

- **Subdomain-based tenancy** (abc-vet.yourdomain.com)
- **Custom domain support** (abc-vet.com)
- **Tenant-isolated file storage** (storage/tenants/[tenant]/practices/[practice]/)
- **Owner dashboard for tenant management**
- **Tenant-aware middleware and authentication**

## 📁 Directory Structure

```
src/
├── app/
│   ├── owner/                      # Owner-only dashboard
│   │   ├── layout.tsx             # Owner layout with navigation
│   │   ├── page.tsx               # Owner dashboard
│   │   ├── tenants/               # Tenant management
│   │   │   ├── page.tsx           # Tenant list
│   │   │   ├── create/            # Create new tenant
│   │   │   └── [tenantId]/        # Tenant details
│   │   └── settings/              # Owner settings
│   └── api/
│       ├── owner/                 # Owner-only APIs
│       │   ├── tenants/           # Tenant CRUD operations
│       │   └── stats/             # Owner dashboard statistics
│       └── files/                 # Tenant-aware file upload/serve
├── components/
│   └── tenant/                    # Tenant-related components
│       ├── TenantSelector.tsx     # Quick tenant access
│       └── TenantDashboard.tsx    # Dashboard components
├── db/
│   └── schemas/
│       └── tenantsSchema.ts       # Tenant database schema
├── lib/
│   ├── tenant-context.ts          # Tenant context utilities
│   └── auth.ts                    # Authentication helpers
└── middleware.ts                  # Enhanced with tenant support

storage/
└── tenants/                       # Tenant-specific file storage
    └── [tenant-subdomain]/
        ├── practices/             # Practice-specific files
        │   └── [practice-id]/
        │       ├── uploads/
        │       ├── medical-imaging/
        │       └── documents/
        ├── uploads/               # Tenant-wide uploads
        ├── medical-imaging/       # Tenant-wide imaging
        └── documents/             # Tenant-wide documents
```

## 🚀 Getting Started

### 1. Run the Migration Script

```bash
npx tsx scripts/add-tenant-support.ts
```

This script will:

- Create the `tenants` and `tenant_domains` tables
- Add `tenant_id` columns to `users` and `practices`
- Add OWNER and COMPANY_ADMIN roles
- Create a default tenant
- Migrate existing data to the default tenant

### 2. Environment Setup

Make sure your `.env.local` includes:

```env
DATABASE_URL="postgresql://..."
# Your existing environment variables
```

### 3. Test the Owner Dashboard

1. Create or update a user with `OWNER` role:

```sql
UPDATE users SET role = 'OWNER' WHERE email = 'your-email@example.com';
```

2. Visit `http://localhost:3000/owner` to access the owner dashboard

### 4. Create Your First Tenant

1. Go to `/owner/tenants/create`
2. Fill in tenant information
3. The system will automatically create the storage directories

## 🔧 Key Features

### Tenant Context System

The `getTenantContext()` function automatically detects tenant from:

- Subdomain (abc-vet.yourdomain.com)
- Custom domain (abc-vet.com)
- Headers (x-tenant-id)

### File Storage Isolation

Files are stored in tenant-specific directories:

```
storage/tenants/abc-vet/practices/1/uploads/file.pdf
```

### Middleware Enhancement

The middleware now:

- Extracts tenant from subdomain/domain
- Adds tenant context to request headers
- Enforces role-based access for owner routes

### Database Schema

#### Tenants Table

- `id` - Primary key
- `name` - Tenant display name
- `subdomain` - Unique subdomain identifier
- `custom_domain` - Optional custom domain
- `db_name` - Database name (for future multi-DB support)
- `storage_path` - File storage path
- `status` - ACTIVE, SUSPENDED, INACTIVE
- `plan` - BASIC, PROFESSIONAL, ENTERPRISE
- `settings` - JSON configuration

#### Updated Tables

- `users` - Added `tenant_id` field
- `practices` - Added `tenant_id` field (required)

## 📊 Owner Dashboard Features

### Statistics Overview

- Total tenants count
- Active tenants count
- Total users across all tenants
- Total practices across all tenants
- Storage usage monitoring
- Monthly growth metrics

### Tenant Management

- List all tenants with stats
- Create new tenants
- View tenant details
- Quick access to tenant domains
- Tenant status management

### File Management

- Tenant-isolated file uploads
- Practice-specific file storage
- Secure file serving with access control

## 🔐 Security Features

### Access Control

- Owner/Company Admin roles for system management
- Tenant isolation in file access
- Role-based route protection
- Secure file serving with authentication

### Data Isolation

- Tenant-scoped database queries
- Isolated file storage paths
- Header-based tenant context

## 🌐 Domain Management

### Subdomain Support

- Automatic tenant detection from subdomain
- Format: `[tenant].yourdomain.com`
- Development support for localhost

### Custom Domain Support

- Optional custom domain configuration
- Domain verification system ready
- Tenant domain management

## 📝 API Endpoints

### Owner APIs

- `GET /api/owner/tenants` - List all tenants
- `POST /api/owner/tenants` - Create new tenant
- `GET /api/owner/stats` - Owner dashboard statistics

### File APIs

- `POST /api/files/upload` - Tenant-aware file upload
- `GET /api/files/[tenantId]/[...path]` - Secure file serving

## 🔄 Migration Guide

### Existing Data

All existing data is automatically assigned to the "default" tenant during migration. This ensures:

- No data loss
- Backward compatibility
- Smooth transition to multi-tenancy

### Gradual Migration

You can gradually migrate features to be tenant-aware:

1. Use `getTenantContext()` in API routes
2. Update database queries to include tenant filtering
3. Use `getTenantStoragePath()` for file operations

## 🛠️ Development Tips

### Testing Multi-Tenancy

1. Create test tenants via the owner dashboard
2. Use different subdomains to test tenant isolation
3. Verify file storage separation
4. Test role-based access control

### Adding Tenant Awareness to APIs

```typescript
import { getTenantContext, getTenantDb } from "@/lib/tenant-context";

export async function GET() {
  const tenantContext = await getTenantContext();
  const db = await getTenantDb(tenantContext);

  // Your tenant-aware logic here
  const results = await db
    .select()
    .from(yourTable)
    .where(eq(yourTable.tenantId, tenantContext.tenantId));
}
```

### File Uploads with Tenant Context

```typescript
import { getTenantStoragePath } from "@/lib/tenant-context";

const tenantContext = await getTenantContext();
const filePath = getTenantStoragePath(
  tenantContext,
  "practices",
  practiceId,
  "uploads",
  filename
);
```

## 🚀 Next Steps

1. **Database Scaling**: Implement separate databases per tenant for larger deployments
2. **Domain Verification**: Add domain ownership verification for custom domains
3. **Billing Integration**: Add subscription and billing management
4. **Analytics**: Implement tenant usage analytics
5. **API Rate Limiting**: Add tenant-based rate limiting
6. **Backup System**: Implement tenant-specific backup strategies

## 🐛 Troubleshooting

### Common Issues

1. **Tenant Not Found**: Check subdomain configuration in DNS
2. **File Access Denied**: Verify tenant context in file serving API
3. **Migration Errors**: Ensure database permissions and existing data integrity
4. **Owner Access Issues**: Verify user has OWNER or COMPANY_ADMIN role

### Debug Mode

Enable debug logging by checking the middleware console output:

```
[Middleware] Path: /owner, TenantId: abc-vet, ServerAuth: true, UserRole: OWNER
```

## 📞 Support

For issues or questions about the multi-tenant implementation, check:

1. Console logs for middleware and API debugging
2. Database constraints and foreign key relationships
3. File system permissions for storage directories
4. DNS configuration for subdomain routing

---

**Multi-tenant system is now fully operational! 🎉**
