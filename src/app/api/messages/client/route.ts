import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import NotificationService from '@/lib/notifications/notification-service';

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
