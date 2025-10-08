# SmartDMV Copilot Instructions

## Project Overview

A multi-tenant veterinary practice management system built with Next.js 15, featuring isolated tenant databases and a centralized owner management platform.

## Multi-Tenant Architecture

- **Owner System**: Centralized at `/src/owner/` with owner database using `drizzle.owner.config.ts`
- **Tenant System**: Per-practice isolation via subdomain routing (e.g., `smartvet.domain.com`)
- **Database Strategy**: Separate PostgreSQL databases per tenant, managed via `src/tenant/db-manager.ts`
- **Routing**: Middleware extracts tenant from hostname/subdomain for database selection

### Key Tenant Patterns

```typescript
// Get tenant-specific database connection
const tenantDb = await getTenantDb(companyId);

// Extract tenant context in API routes
const { tenantId, subdomain } = await getTenantContext();
```

## Development Commands

```bash
# Main development (runs on port 9002 with Turbopack)
npm run dev

# Full stack with WebSocket server
npm run dev:all

# Database operations per environment
npm run db:owner:push    # Owner database schema
npm run db:tenant:push   # All tenant databases
npm run db:tenant:seed smartvet --all  # Seed specific tenant

# AI development server
npm run genkit:dev
```

## Database Configuration

- **Default Tenant Schema**: `src/db/schema.ts` with `drizzle.config.ts`
- **Owner Schema**: Separate schema for platform management
- **Per-Tenant Configs**: `drizzle.{tenant}.config.ts` for development
- **Connection Caching**: Tenant DB connections cached in `tenantDbCache`

## API Route Patterns

- **Tenant-Aware**: Use `getTenantContext()` for multi-tenant data isolation
- **File Uploads**: Server runtime required (`export const runtime = 'nodejs'`)
- **AI Integration**: Practice-specific Genkit instances via `getPracticeAI(practiceId)`

## UI Component Standards

- **shadcn/ui** components with Radix UI primitives
- **Forms**: React Hook Form + Zod validation with shadcn Form components
- **Styling**: Tailwind CSS with CSS variables, component variants via `class-variance-authority`
- **Icons**: Custom SVG components in `src/components/icons/`

## Real-Time Features

- **WebSocket Server**: Runs on port 9003 for telemedicine/collaboration
- **Connection Management**: Room-based connections in `src/websocket-server/`
- **Start Command**: `npm run ws` or included in `npm run dev:all`

## AI Integration

- **Google Genkit**: Practice-specific AI instances with encrypted API keys
- **Model**: `googleai/gemini-2.0-flash` as default
- **Usage**: Import from `src/ai/genkit.ts`, use `getPracticeAI()` for tenant isolation

## Critical File Locations

- **Middleware**: `src/middleware.ts` (tenant extraction, auth routing)
- **Tenant DB Manager**: `src/tenant/db-manager.ts` (connection pooling)
- **Tenant Context**: `src/lib/tenant-context.ts` (request-scoped tenant data)
- **Multi-tenant Docs**: `MULTI_TENANCY.md` for architecture details

## TypeScript Patterns

- Use `@/` imports for src paths
- Strict mode enabled, prefer interfaces for component props
- Drizzle schema types: `typeof schema.$inferSelect` for type safety
