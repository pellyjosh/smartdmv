import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
  const { id } = await params;
  const notificationId = parseInt(id, 10);

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    console.log('Marking notification as read:', notificationId);

    // First check if notification exists
    const existingNotification = await tenantDb.query.notifications.findFirst({
      where: eq(notifications.id, notificationId)
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    // Update the notification
    await tenantDb.update(notifications)
      .set({ 
        read: true,
        updated_at: new Date().toISOString(), // Use snake_case DB column
      } as any)
      .where(eq(notifications.id, notificationId));

    console.log('Notification marked as read:', notificationId);

    return NextResponse.json({ 
      success: true, 
      message: 'Notification marked as read'
    }, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ 
      error: 'Failed to mark notification as read due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
