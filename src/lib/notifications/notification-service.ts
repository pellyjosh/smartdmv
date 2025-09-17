// src/lib/notifications/notification-service.ts
import { db } from '@/db/index';
import { notifications, users, practices } from '@/db/schema';
import { eq, desc, and, isNull, or } from 'drizzle-orm';
import { notificationTypeEnum } from '@/db/schemas/notificationsSchema';

export type NotificationType = typeof notificationTypeEnum[number];

export interface CreateNotificationInput {
  userId?: string;
  practiceId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  relatedId?: string;
  relatedType?: string;
  link?: string;
  // Recipients can be roles that will auto-resolve to users
  recipients?: ('admin' | 'practitioner' | 'client' | 'owner')[];
}

export interface NotificationFilter {
  userId?: string;
  practiceId?: string;
  type?: NotificationType;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(input: CreateNotificationInput): Promise<{ success: boolean; error?: string; notificationId?: string }> {
    try {
      console.log('🔔 NotificationService.createNotification called with:', input);
      
      // If userId is provided, create notification directly
      if (input.userId) {
        console.log('📝 Creating notification for userId:', input.userId);
        
        const userIdInt = parseInt(input.userId);
        if (isNaN(userIdInt)) {
          console.error('❌ Invalid userId - not a number:', input.userId);
          return { success: false, error: `Invalid userId: ${input.userId}` };
        }
        
        const notificationData = {
          userId: userIdInt,
          practiceId: input.practiceId ? parseInt(input.practiceId) : null,
          title: input.title,
          message: input.message,
          type: input.type || 'info',
          relatedId: input.relatedId,
          relatedType: input.relatedType,
          link: input.link,
        };
        
        console.log('📝 Inserting notification with data:', notificationData);
        
        const [notification] = await db.insert(notifications).values(notificationData).returning();

        console.log('✅ Notification created successfully:', notification);
        return { success: true, notificationId: notification.id.toString() };
      }

      // If recipients are provided, resolve them to user IDs
      if (input.recipients && input.recipients.length > 0 && input.practiceId) {
        const userIds = await this.resolveRecipients(input.recipients, input.practiceId);
        
        const notificationPromises = userIds.map(userId => 
          db.insert(notifications).values({
            userId: userId,
            practiceId: parseInt(input.practiceId!),
            title: input.title,
            message: input.message,
            type: input.type || 'info',
            relatedId: input.relatedId,
            relatedType: input.relatedType,
            link: input.link,
          })
        );

        await Promise.all(notificationPromises);
        return { success: true };
      }

      return { success: false, error: 'Either userId or recipients with practiceId must be provided' };
    } catch (error) {
      console.error('NotificationService.createNotification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create multiple notifications for different users
   */
  static async createBulkNotifications(notifications: CreateNotificationInput[]): Promise<{ success: boolean; error?: string; created?: number }> {
    try {
      let totalCreated = 0;
      
      for (const notification of notifications) {
        const result = await this.createNotification(notification);
        if (result.success) {
          totalCreated++;
        }
      }

      return { success: true, created: totalCreated };
    } catch (error) {
      console.error('NotificationService.createBulkNotifications error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get notifications for a user with filtering
   */
  static async getNotifications(filter: NotificationFilter) {
    try {
      const conditions = [];
      
      if (filter.userId) {
        conditions.push(eq(notifications.userId, parseInt(filter.userId)));
      }
      
      if (filter.practiceId) {
        conditions.push(eq(notifications.practiceId, parseInt(filter.practiceId)));
      }
      
      if (filter.type) {
        conditions.push(eq(notifications.type, filter.type));
      }
      
      if (filter.read !== undefined) {
        conditions.push(eq(notifications.read, filter.read));
      }

      const query = db.select({
        id: notifications.id,
        userId: notifications.userId,
        practiceId: notifications.practiceId,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        read: notifications.read,
        relatedId: notifications.relatedId,
        relatedType: notifications.relatedType,
        link: notifications.link,
        createdAt: notifications.created_at,
        updatedAt: notifications.updated_at,
      })
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notifications.created_at))
      .limit(filter.limit || 50)
      .offset(filter.offset || 0);

      const result = await query;
      return { success: true, data: result };
    } catch (error) {
      console.error('NotificationService.getNotifications error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const conditions = [eq(notifications.id, parseInt(notificationId))];
      if (userId) {
        conditions.push(eq(notifications.userId, parseInt(userId)));
      }

      await db.update(notifications)
        .set({ 
          read: true,
          updated_at: new Date()
        })
        .where(and(...conditions));

      return { success: true };
    } catch (error) {
      console.error('NotificationService.markAsRead error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, practiceId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const conditions = [eq(notifications.userId, parseInt(userId))];
      if (practiceId) {
        conditions.push(eq(notifications.practiceId, parseInt(practiceId)));
      }

      await db.update(notifications)
        .set({ 
          read: true,
          updated_at: new Date()
        })
        .where(and(...conditions));

      return { success: true };
    } catch (error) {
      console.error('NotificationService.markAllAsRead error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string, practiceId?: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const conditions = [
        eq(notifications.userId, parseInt(userId)),
        eq(notifications.read, false)
      ];
      if (practiceId) {
        conditions.push(eq(notifications.practiceId, parseInt(practiceId)));
      }

      const result = await db.select({ count: notifications.id })
        .from(notifications)
        .where(and(...conditions));

      return { success: true, count: result.length };
    } catch (error) {
      console.error('NotificationService.getUnreadCount error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const conditions = [eq(notifications.id, parseInt(notificationId))];
      if (userId) {
        conditions.push(eq(notifications.userId, parseInt(userId)));
      }

      await db.delete(notifications).where(and(...conditions));
      return { success: true };
    } catch (error) {
      console.error('NotificationService.deleteNotification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Resolve recipients (roles) to actual user IDs within a practice
   */
  private static async resolveRecipients(recipients: string[], practiceId: string): Promise<number[]> {
    try {
      const conditions = [];
      
      // Add practice filter
      conditions.push(
        or(
          eq(users.practiceId, parseInt(practiceId)),
          eq(users.currentPracticeId, parseInt(practiceId))
        )
      );

      // Add role filters
      if (recipients.includes('admin')) {
        conditions.push(eq(users.role, 'practice_admin'));
      }
      if (recipients.includes('practitioner')) {
        conditions.push(eq(users.role, 'practitioner'));
      }
      if (recipients.includes('client')) {
        conditions.push(eq(users.role, 'client'));
      }
      if (recipients.includes('owner')) {
        conditions.push(eq(users.role, 'practice_owner'));
      }

      const userResults = await db.select({ id: users.id })
        .from(users)
        .where(and(...conditions));

      return userResults.map((user: { id: number }) => user.id);
    } catch (error) {
      console.error('NotificationService.resolveRecipients error:', error);
      return [];
    }
  }

  /**
   * Create appointment-related notifications
   */
  static async createAppointmentNotification({
    action,
    appointmentId,
    practiceId,
    petName,
    appointmentDate,
    appointmentTime,
    clientName,
    additionalMessage
  }: {
    action: 'scheduled' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed';
    appointmentId: string;
    practiceId: string;
    petName?: string;
    appointmentDate: string;
    appointmentTime: string;
    clientName?: string;
    additionalMessage?: string;
  }) {
    const petDisplay = petName || 'pet';
    const clientDisplay = clientName || 'client';
    
    let title = '';
    let message = '';
    
    switch (action) {
      case 'scheduled':
        title = 'New Appointment Scheduled';
        message = `New appointment for ${petDisplay} scheduled for ${appointmentDate} at ${appointmentTime}`;
        break;
      case 'rescheduled':
        title = 'Appointment Rescheduled';
        message = `${clientDisplay} has rescheduled appointment for ${petDisplay} to ${appointmentDate} at ${appointmentTime}. Please review and approve.`;
        break;
      case 'cancelled':
        title = 'Appointment Cancelled';
        message = `${clientDisplay} has cancelled appointment for ${petDisplay} scheduled for ${appointmentDate} at ${appointmentTime}`;
        break;
      case 'no_show':
        title = 'Appointment No-Show';
        message = `Appointment for ${petDisplay} scheduled for ${appointmentDate} at ${appointmentTime} was marked as no-show`;
        break;
      case 'completed':
        title = 'Appointment Completed';
        message = `Appointment for ${petDisplay} on ${appointmentDate} at ${appointmentTime} has been completed`;
        break;
    }

    if (additionalMessage) {
      message += `. ${additionalMessage}`;
    }

    return await this.createNotification({
      practiceId,
      title,
      message,
      type: 'appointment',
      recipients: ['admin', 'practitioner'],
      relatedId: appointmentId,
      relatedType: 'appointment',
      link: `/admin/appointments/${appointmentId}`
    });
  }
}

export default NotificationService;
