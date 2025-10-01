#!/usr/bin/env tsx
/**
 * Multi-Tenant Migration / Push Script
 * Runs `drizzle-kit push` or `drizzle-kit migrate` sequentially against ALL (or filtered) tenant databases.
 *
 * Usage:
 *  npm run db:tenant:push                # push schema changes to all ACTIVE tenants
 *  npm run db:tenant:migrate             # apply migrations to all ACTIVE tenants
 *
 * Optional flags (pass after --):
 *  --action=push|migrate (inferred from npm script if omitted)
 *  --status=ACTIVE|PENDING|SUSPENDED|INACTIVE (default ACTIVE; use ALL to target every status)
 *  --tenants=slug1,slug2  (limit to specific tenant subdomains)
 *  --include-pending      (shorthand to also include PENDING tenants when status filter is ACTIVE)
 *  --dry-run              (show what would run without executing drizzle commands)
 *  --continue-on-error    (do not abort on first failure; report summary at end)
 *
 * Examples:
 *  npm run db:tenant:push -- --status=ALL
 *  npm run db:tenant:migrate -- --tenants=smartvet,alpha-vet
 *  npm run db:tenant:push -- --dry-run
 */
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/db/owner-schema';
import { asc } from 'drizzle-orm';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

interface Args {
  action: 'push' | 'migrate';
  status: string; // ACTIVE, ALL, etc.
  tenantSlugs?: string[]; // explicit list via --tenants
  singleTenantArg?: string; // positional arg for single tenant (first non -- token that's not push/migrate)
  includePending?: boolean;
  dryRun?: boolean;
  continueOnError?: boolean;
}

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const args: Args = { action: 'push', status: 'ACTIVE' } as any;
  const positional: string[] = [];

  for (const part of raw) {
    if (part.startsWith('--')) {
      const [key, valueRaw] = part.replace(/^--/, '').split('=');
      const value = valueRaw ?? 'true';
      switch (key) {
        case 'action':
          if (value === 'push' || value === 'migrate') args.action = value;
          break;
        case 'status':
          args.status = value.toUpperCase();
          break;
        case 'tenants':
          args.tenantSlugs = value.split(',').map(s => s.trim()).filter(Boolean);
          break;
        case 'include-pending':
          args.includePending = true;
          break;
        case 'dry-run':
          args.dryRun = true;
          break;
        case 'continue-on-error':
          args.continueOnError = true;
          break;
      }
    } else if (part === 'push' || part === 'migrate') {
      args.action = part;
    } else {
      positional.push(part);
    }
  }

  // Single positional argument treated as single tenant slug (unless tenants already provided)
  if (!args.tenantSlugs?.length && positional.length === 1) {
    args.singleTenantArg = positional[0];
  }

  // Infer action if provided via npm script name (fallback already set)
  if (process.env.npm_lifecycle_script?.includes('migrate')) args.action = 'migrate';

  return args;
}

async function main() {
  const args = parseArgs();
  console.log(`\n🚀 Multi-tenant ${args.action.toUpperCase()} starting...`);
  console.log(`   Status filter: ${args.status}`);
  if (args.tenantSlugs?.length) console.log(`   Specific tenants: ${args.tenantSlugs.join(', ')}`);
  if (args.singleTenantArg) console.log(`   Single tenant (positional): ${args.singleTenantArg}`);
  if (args.dryRun) console.log('   DRY RUN mode: no changes will be applied.');

  // Fetch all tenants
  const allTenants = await ownerDb.select().from(tenants).orderBy(asc(tenants.subdomain));

  // Filter by status
  let filtered = allTenants.filter(t => {
    if (args.status === 'ALL') return true;
    if (args.status === 'ACTIVE') {
      if (t.status === 'ACTIVE') return true;
      if (args.includePending && t.status === 'PENDING') return true;
      return false;
    }
    return t.status === args.status;
  });

  // Filter by explicit tenant list OR single positional arg
  if (args.tenantSlugs?.length) {
    const slugSet = new Set(args.tenantSlugs.map(s => s.toLowerCase()));
    filtered = filtered.filter(t => slugSet.has((t.subdomain || '').toLowerCase()));
  } else if (args.singleTenantArg) {
    const target = args.singleTenantArg.toLowerCase();
    filtered = filtered.filter(t => (t.subdomain || '').toLowerCase() === target);
  }

  if (filtered.length === 0) {
    console.log('⚠️  No tenants matched the provided filters. Exiting.');
    return;
  }

  console.log(`\n🏢 Targeting ${filtered.length} tenant database(s):`);
  filtered.forEach(t => console.log(` • ${t.subdomain} (${t.status})`));

  const failures: { tenant: string; error: string }[] = [];
  const startAll = Date.now();

  for (const tenant of filtered) {
    const label = tenant.subdomain || `tenant-${tenant.id}`;
    const encodedPassword = encodeURIComponent(tenant.dbPassword || '');
    if (!tenant.dbHost || !tenant.dbName) {
      console.log(`\n⏭️  Skipping ${label} (missing dbHost/dbName)`);
      continue;
    }
    const dbUser = tenant.dbUser || 'postgres';
    const databaseUrl = `postgresql://${dbUser}:${encodedPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?sslmode=require`;

    console.log(`\n➡️  ${args.action.toUpperCase()} ${label}`);
    console.log(`    DB: ${tenant.dbName} @ ${tenant.dbHost}:${tenant.dbPort}`);

    // Build temp drizzle config
    const tempConfigPath = path.join(process.cwd(), `drizzle.${label}.${Date.now()}.config.ts`);
    const configContent = `import type { Config } from 'drizzle-kit';\nexport default {\n  schema: './src/db/schema.ts',\n  out: './src/db/migrations',\n  dialect: 'postgresql',\n  dbCredentials: { url: '${databaseUrl}', ssl: { rejectUnauthorized: false } },\n  verbose: true,\n  strict: true,\n} satisfies Config;`;

    if (args.dryRun) {
      console.log(`    (dry-run) Would create config: ${path.basename(tempConfigPath)}`);
      console.log(`    (dry-run) Would run: npx drizzle-kit ${args.action} --config ${path.basename(tempConfigPath)}`);
      continue; // skip execution
    }

    try {
      writeFileSync(tempConfigPath, configContent, 'utf8');
      const cmd = 'npx';
      const cmdArgs = ['drizzle-kit', args.action, '--config', tempConfigPath];
      console.log(`    Running: ${cmd} ${cmdArgs.join(' ')}`);
      const started = Date.now();
      const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' } });
      const took = Date.now() - started;
      if (result.status !== 0) {
        const errMsg = `Exit code ${result.status}`;
        console.error(`    ❌ Failed for ${label} (${errMsg}) in ${took}ms`);
        failures.push({ tenant: label, error: errMsg });
        if (!args.continueOnError) {
          if (existsSync(tempConfigPath)) unlinkSync(tempConfigPath);
          console.log('\n🛑 Aborting due to failure (use --continue-on-error to process remaining tenants).');
          break;
        }
      } else {
        console.log(`    ✅ Success for ${label} in ${took}ms`);
      }
      if (existsSync(tempConfigPath)) unlinkSync(tempConfigPath);
    } catch (err: any) {
      console.error(`    ❌ Exception for ${label}: ${err.message}`);
      failures.push({ tenant: label, error: err.message });
      if (existsSync(tempConfigPath)) unlinkSync(tempConfigPath);
      if (!args.continueOnError) break;
    }
  }

  const totalMs = Date.now() - startAll;
  console.log(`\n⏱️  Completed multi-tenant ${args.action} in ${totalMs}ms`);
  if (args.dryRun) console.log('ℹ️  Dry run only — no database changes made.');
  if (failures.length) {
    console.log(`\n❌ ${failures.length} tenant(s) failed:`);
    failures.forEach(f => console.log(` • ${f.tenant}: ${f.error}`));
    process.exit(1);
  } else if (!args.dryRun) {
    console.log('\n🎉 All tenant databases processed successfully.');
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
