import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    console.log('Marking notification as read:', notificationId);

    // First check if notification exists
    const existingNotification = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId)
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    // Update the notification - use type suppression for Drizzle union type
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.update(notifications)
      .set({ 
        read: true,
        updatedAt: new Date().toISOString(), // Convert to ISO string for SQLite compatibility
      })
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
