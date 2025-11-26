// /Users/Hubolux/Documents/Project 001/HuboluxJobs/smartdmv_new/src/app/api/custom-fields/values/group/[groupId]/route.ts
import { NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { customFieldValues } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { groupId } = params;

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const values = await tenantDb.query.customFieldValues.findMany({
      where: eq(customFieldValues.groupId, parseInt(groupId, 10)),
    });

    return NextResponse.json(values);
  } catch (error) {
    console.error('Error fetching values:', error);
    return NextResponse.json({ error: 'Failed to fetch values' }, { status: 500 });
  }
}

// NOTE: You need to create this file at the specified path.  
// Also ensure your database and schemas are set up correctly as indicated earlier.