import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq, and, inArray } from 'drizzle-orm';
import { users, UserRoleEnum } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const staffRoles = [
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.PRACTICE_MANAGER,
  UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.VETERINARIAN,
    UserRoleEnum.TECHNICIAN,
    UserRoleEnum.RECEPTIONIST,
    UserRoleEnum.ACCOUNTANT,
    UserRoleEnum.CASHIER,
    UserRoleEnum.OFFICE_MANAGER,
  ];

  const rows = await db.select().from(users)
    .where(and(eq(users.practiceId, Number(ctx.practiceId)), inArray(users.role as any, staffRoles as any)));

  return NextResponse.json(rows.map(u => {
    const nameStr = (u.name ?? '') as unknown as string;
    const parts = typeof nameStr === 'string' ? nameStr.split(' ') : [];
    const first = (u as any).firstName || (parts[0] || (u.username as unknown as string));
    const last = (u as any).lastName || (parts.slice(1).join(' ') || '');
    return {
      id: u.id,
      firstName: first,
      lastName: last,
      role: u.role,
    };
  }));
}
