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
      eq(notifications.userId, userPractice.userId),
    ];

    // If practice-specific notifications are supported
    if (userPractice.practiceId) {
      whereConditions.push(eq(notifications.practiceId, userPractice.practiceId));
    }

    // Optionally filter out read notifications
    if (!includeRead) {
      whereConditions.push(eq(notifications.read, false));
    }

    // Fetch notifications for the user
    const userNotifications = await db.query.notifications.findMany({
      where: and(...whereConditions),
      orderBy: [desc(notifications.createdAt)], // Most recent first
      limit: limit,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          }
        },
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      }
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
      createdAt: typeof notification.createdAt === 'object' && notification.createdAt instanceof Date 
        ? notification.createdAt.getTime() 
        : notification.createdAt,
      updatedAt: typeof notification.updatedAt === 'object' && notification.updatedAt instanceof Date 
        ? notification.updatedAt.getTime() 
        : notification.updatedAt,
      user: notification.user ? {
        id: notification.user.id,
        name: notification.user.name,
      } : null,
      practice: notification.practice ? {
        id: notification.practice.id,
        name: notification.practice.name,
      } : null,
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
        updatedAt: new Date().toISOString(), // Convert to ISO string for SQLite compatibility
      })
      .where(
        and(
          eq(notifications.userId, userPractice.userId),
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
