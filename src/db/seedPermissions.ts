import { db } from '@/db';
import { roles } from '@/db/schemas/rolesSchema';
import { UserRoleEnum } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Minimal permission records to ensure permissions exist for managing permissions
const PERMISSIONS_TO_ADD = [
  { id: 'permissions_create', resource: 'permissions', action: 'CREATE', granted: true, category: 'Users & Access' },
  { id: 'permissions_read', resource: 'permissions', action: 'READ', granted: true, category: 'Users & Access' },
  { id: 'permissions_update', resource: 'permissions', action: 'UPDATE', granted: true, category: 'Users & Access' },
  { id: 'permissions_delete', resource: 'permissions', action: 'DELETE', granted: true, category: 'Users & Access' },
  { id: 'permissions_manage', resource: 'permissions', action: 'MANAGE', granted: true, category: 'Users & Access' },
];

export async function seedPermissions() {
  console.log('Seeding minimal permissions onto SUPER_ADMIN role...');

  // Find existing SUPER_ADMIN system role
  const existing = await db
    .select()
    .from(roles)
    .where(and(eq(roles.name, UserRoleEnum.SUPER_ADMIN), eq(roles.isSystemDefined, true)))
    .limit(1);

  if (existing.length === 0) {
    // Create minimal SUPER_ADMIN role with the permission records
    await db.insert(roles).values({
      name: UserRoleEnum.SUPER_ADMIN,
      displayName: 'Super Administrator',
      description: 'Auto-created super admin by seedPermissions',
      isSystemDefined: true,
      isActive: true,
      practiceId: null,
      permissions: PERMISSIONS_TO_ADD,
    });
    console.log('✓ Created SUPER_ADMIN role with minimal permissions');
    return;
  }

  const role = existing[0] as any;
  const currentPermissions: any[] = Array.isArray(role.permissions) ? role.permissions : [];

  // Merge permissions by id, preserving existing entries
  const map = new Map<string, any>();
  for (const p of currentPermissions) {
    if (p && p.id) map.set(p.id, p);
  }
  for (const p of PERMISSIONS_TO_ADD) {
    if (!map.has(p.id)) map.set(p.id, p);
  }

  const merged = Array.from(map.values());

  await db.update(roles).set({ permissions: merged }).where(eq(roles.id, role.id));
  console.log(`✓ Updated SUPER_ADMIN role (id=${role.id}) with ${PERMISSIONS_TO_ADD.length} permissions`);
}

// Run directly
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('Permission seeding completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Permission seeding failed:', err);
      process.exit(1);
    });
}
