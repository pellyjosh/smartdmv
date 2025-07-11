# AGENT.md - SmartDMV Veterinary Management System

## Commands
- **Dev**: `npm run dev` (starts on port 9002 with turbopack)
- **Build**: `npm run build` && `npm run typecheck`
- **Lint**: `npm run lint`
- **Type Check**: `npm run typecheck` (runs `tsc --noEmit`)
- **Database**: `npm run db:push` (apply schema), `npm run db:studio` (view), `npm run db:seed` (populate)
- **AI**: `npm run genkit:dev` (start Genkit server)

## Architecture
- **Next.js 15** full-stack app with App Router and React Server Components
- **Database**: PostgreSQL/SQLite with Drizzle ORM (configurable via `DB_TYPE` env var)
- **UI**: shadcn/ui components with Radix UI primitives and Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **State**: TanStack Query for server state management
- **AI**: Google Genkit integration for AI features
- **Auth**: Custom auth system with session management

## Code Style
- **TypeScript**: Strict mode enabled, use `@/` imports for src paths
- **Components**: Functional components with TypeScript interfaces for props
- **Forms**: Use `useForm` with `zodResolver` and shadcn Form components
- **API**: RESTful endpoints in `src/app/api/` with proper error handling
- **Database**: Define schemas in `src/db/schema.ts`, use Drizzle ORM queries
- **Styling**: Tailwind with CSS variables, component variants using `class-variance-authority`
- **Error Handling**: Use toast notifications, proper HTTP status codes, client-side error boundaries
