import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching notifications for client ID:', user.id);

    const notificationsData = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
      with: {
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(notifications.createdAt)]
    });

    console.log(`Found ${notificationsData.length} notifications for client ${user.id}`);

    // Transform the data to match the frontend expectations
    const transformedNotifications = notificationsData.map((notification: any) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      read: notification.read,
      createdAt: notification.createdAt,
      link: notification.link,
      relatedEntityName: notification.relatedId ? `Related Item ${notification.relatedId}` : null,
    }));

    return NextResponse.json(transformedNotifications, { status: 200 });
  } catch (error) {
    console.error('Error fetching client notifications:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch notifications due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
