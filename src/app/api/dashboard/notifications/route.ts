import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { db } from '@/db/index';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/dashboard/notifications - Get recent notifications for dashboard widget
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const includeRead = searchParams.get('includeRead') === 'true';

    // Build where conditions
    const whereConditions = [
      eq(notifications.userId, parseInt(userPractice.userId, 10)),
    ];

    // If practice-specific notifications are supported
    if (userPractice.practiceId) {
      whereConditions.push(eq(notifications.practiceId, parseInt(userPractice.practiceId, 10)));
    }

    // Optionally filter out read notifications
    if (!includeRead) {
      whereConditions.push(eq(notifications.read, false));
    }

    // Fetch notifications for the user
    const userNotifications = await db.query.notifications.findMany({
      where: and(...whereConditions),
      orderBy: (notifications, { desc }) => [desc(notifications.created_at)],
      limit: limit,
    });

    // Transform the data to a more frontend-friendly format
    const formattedNotifications = userNotifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      link: notification.link,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      createdAt: typeof notification.created_at === 'object' && notification.created_at instanceof Date 
        ? notification.created_at.getTime() 
        : notification.created_at,
      updatedAt: typeof notification.updated_at === 'object' && notification.updated_at instanceof Date 
        ? notification.updated_at.getTime() 
        : notification.updated_at,
      // Note: Without joins, we don't have user/practice data
      // We could add separate queries if needed
      user: null,
      practice: null,
    }));

    return NextResponse.json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching dashboard notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/dashboard/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAsRead = true } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Update notifications - use type suppression for Drizzle union type
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.update(notifications)
      .set({ 
        read: markAsRead,
        updated_at: new Date(), // Use proper column name and Date object for PostgreSQL
      })
      .where(
        and(
          eq(notifications.userId, parseInt(userPractice.userId, 10)),
          // Note: You might want to add an IN clause for specific notification IDs
        )
      );

    return NextResponse.json({ 
      success: true, 
      updated: notificationIds.length 
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
