import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import NotificationService from '@/lib/notifications/notification-service';
import { db } from "@/db/index";
import { notifications, users } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching messages for client:', user.id);

    // Fetch notifications that represent messages/communications
    // Filter for message-related notification types
    const messagesData = await db.query.notifications.findMany({
      where: and(
        eq(notifications.practiceId, parseInt(user.practiceId!)),
        or(
          eq(notifications.type, 'message'),
          eq(notifications.relatedType, 'client')
        )
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(notifications.created_at)],
    });

    // Transform notifications into message format
    const messages = messagesData.map((notification: any) => {        
      return {
        id: notification.id,
        subject: notification.title,
        content: notification.message,
        contactMethod: 'message',
        urgency: 'medium',
        status: notification.read ? 'read' : 'unread',
        practitioner: notification.user?.role === 'VETERINARIAN' ? {
          id: notification.user.id,
          name: notification.user.name,
          email: notification.user.email,
        } : null,
        petId: notification.relatedType === 'pet' ? notification.relatedId : null,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at,
        responses: [], // We'll implement message threads later
      };
    });

    console.log(`Found ${messages.length} messages`);

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch messages due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, priority, message, petId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    // Build notification payload for practice staff
    const title = subject && subject.trim().length > 0 ? subject.trim() : 'New message from client';
    const notificationMessage = `[Priority: ${priority || 'medium'}] ${message}`;

    // Try to create a notification for practice staff (admin + practitioner)
    const result = await NotificationService.createNotification({
      practiceId: user.practiceId?.toString(),
      title,
      message: notificationMessage,
      type: 'message',
      recipients: ['admin', 'practitioner'],
      relatedId: petId ? petId.toString() : undefined,
      relatedType: petId ? 'pet' : undefined,
    } as any);

    if (!result.success) {
      console.error('Failed to create notification for message:', result.error);
      // Still return success to client to avoid exposing internal failures; frontend can show a warning if needed
      return NextResponse.json({ success: false, error: result.error || 'Failed to deliver message' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
