import { NextResponse, NextRequest } from "next/server";
import NotificationService from "@/lib/notifications/notification-service";
import { getCurrentUser } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, type, recipients, practiceId, relatedId, relatedType, link, userId } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    // Get user's practice ID if not provided
    const userPracticeId = practiceId || user.practiceId || user.currentPracticeId;

    // Create notification using the service
    const result = await NotificationService.createNotification({
      userId: userId,
      practiceId: userPracticeId?.toString(),
      title,
      message,
      type,
      recipients,
      relatedId,
      relatedType,
      link
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Notification created successfully",
      notificationId: result.notificationId
    });

  } catch (error: any) {
    console.error("Notification creation error:", error);
    return NextResponse.json(
      { error: "Failed to create notification", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const read = searchParams.get('read');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get notifications using the service
    const result = await NotificationService.getNotifications({
      userId: user.id.toString(),
      practiceId: user.practiceId?.toString() || user.currentPracticeId?.toString(),
      type: type as any,
      read: read !== null ? read === 'true' : undefined,
      limit,
      offset
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      notifications: result.data,
      count: result.data?.length || 0
    });

  } catch (error: any) {
    console.error("Notification fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const markAllRead = searchParams.get('markAllRead') === 'true';

    if (markAllRead) {
      // Mark all notifications as read
      const result = await NotificationService.markAllAsRead(
        user.id.toString(),
        user.practiceId?.toString() || user.currentPracticeId?.toString()
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    // Mark specific notification as read
    const result = await NotificationService.markAsRead(notificationId, user.id.toString());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Notification marked as read" });

  } catch (error: any) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notification", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const result = await NotificationService.deleteNotification(notificationId, user.id.toString());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Notification deleted" });

  } catch (error: any) {
    console.error("Notification delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification", details: error.message },
      { status: 500 }
    );
  }
}
