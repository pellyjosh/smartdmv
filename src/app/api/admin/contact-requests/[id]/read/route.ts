import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || (user.role !== "ADMINISTRATOR" && user.role !== "SUPER_ADMIN" && user.role !== "VETERINARIAN")) {
      return NextResponse.json({ error: 'Unauthorized. Administrator or veterinarian access required.' }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    console.log('Marking contact request as read:', id);

    // Update the contact to mark as read
    const result = await tenantDb.update(contacts)
      .set({ 
        isRead: true,
        updatedAt: new Date(),
        respondedAt: new Date(),
        respondedBy: parseInt(user.id)
      })
      .where(and(
        eq(contacts.id, parseInt(id)),
        eq(contacts.practiceId, parseInt(user.practiceId!))
      ))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Contact request not found or access denied' }, { status: 404 });
    }

    console.log(`Contact request ${id} marked as read`);

    return NextResponse.json({ success: true, request: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Error marking contact request as read:', error);
    return NextResponse.json({ 
      error: 'Failed to mark contact request as read due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
