/**
 * Appointment Automation Service
 * 
 * This service automatically updates past appointments from 'scheduled' to 'no_show'
 * when they are past their scheduled time and haven't been marked as completed.
 */

import { ownerDb } from '../db/owner-db.config';
import { tenants } from '../owner/db/schemas/ownerSchema';
import { getTenantDb, TenantConnectionConfig } from '../db/tenant-db';
import { appointments } from '../db/schemas/appointmentsSchema';
import { eq, and, lt, inArray } from 'drizzle-orm';
import NotificationService from '../lib/notifications/notification-service';

export class AppointmentAutomation {
  private lastRunTime: Date = new Date();

  /**
   * Get tenant database by tenant info (for background processes)
   */
  private async getTenantDbByInfo(tenant: any) {
    // Create tenant config
    const tenantConfig: TenantConnectionConfig = {
      tenantId: tenant.subdomain,
      databaseName: tenant.databaseName,
      host: tenant.databaseHost,
      port: tenant.databasePort,
      username: tenant.databaseUser,
      password: tenant.databasePassword,
    };

    const tenantConnection = await getTenantDb(tenantConfig);
    return tenantConnection.db;
  }

  /**
   * Check for missed appointments and update them to no_show status
   * This runs periodically via the websocket server cleanup interval
   */
  async processOverdueAppointments(): Promise<void> {
    try {
      // Get all tenants from owner database
      const allTenants = await ownerDb.select().from(tenants);
      console.log(`🔍 Checking for overdue appointments across ${allTenants.length} tenants...`);
      
      const currentTime = new Date();
      const gracePeriodMinutes = 15; // Allow 15 minutes grace period after scheduled time
      const cutoffTime = new Date(currentTime.getTime() - (gracePeriodMinutes * 60 * 1000));

      for (const tenant of allTenants) {
        try {
          // Get tenant-specific database
          const db = await this.getTenantDbByInfo(tenant);
          
          console.log(`🔍 Processing overdue appointments for tenant: ${tenant.subdomain}...`);

          // Find appointments that are past their scheduled time and still in 'scheduled' or 'approved' status
          const overdueAppointments = await db
            .select({
              id: appointments.id,
              title: appointments.title,
              date: appointments.date,
              status: appointments.status,
              practiceId: appointments.practiceId,
              clientId: appointments.clientId,
              practitionerId: appointments.practitionerId,
              petId: appointments.petId,
            })
            .from(appointments)
            .where(
              and(
                lt(appointments.date, cutoffTime),
                inArray(appointments.status, ['scheduled', 'approved'])
              )
            );

          if (overdueAppointments.length === 0) {
            console.log(`✅ No overdue appointments found for tenant ${tenant.subdomain}`);
            continue;
          }

          console.log(`🚨 Found ${overdueAppointments.length} overdue appointments to mark as no-show for tenant ${tenant.subdomain}`);

          // Update each overdue appointment
          for (const appointment of overdueAppointments) {
            try {
              // Update appointment status to no_show
              await db
                .update(appointments)
                .set({
                  status: 'no_show',
                  notes: `Automatically marked as no-show on ${currentTime.toISOString()} - appointment time passed without attendance (${gracePeriodMinutes} minute grace period)`,
                  updatedAt: currentTime
                })
                .where(eq(appointments.id, appointment.id));

              console.log(`📝 Updated appointment ${appointment.id} to no-show status for tenant ${tenant.subdomain}`);

              // Send notifications to relevant parties
              await this.sendNoShowNotifications(appointment, db);

            } catch (error) {
              console.error(`❌ Failed to update appointment ${appointment.id} for tenant ${tenant.subdomain}:`, error);
            }
          }

          console.log(`✅ Processed ${overdueAppointments.length} overdue appointments for tenant ${tenant.subdomain}`);
        } catch (tenantError) {
          console.error(`❌ Error processing tenant ${tenant.subdomain}:`, tenantError);
          // Continue processing other tenants even if one fails
        }
      }

      this.lastRunTime = currentTime;
      console.log('✅ Completed overdue appointment processing for all tenants');

    } catch (error) {
      console.error('❌ Error in appointment automation:', error);
    }
  }

  /**
   * Send notifications for no-show appointments
   */
  private async sendNoShowNotifications(appointment: any, db: any): Promise<void> {
    try {
      console.log(`📧 Sending no-show notifications for appointment ${appointment.id}`);
      
      // Get appointment details first
      const appointmentDetails = await db.query.appointments.findFirst({
        where: eq(appointments.id, appointment.id),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
            }
          },
          pet: {
            columns: {
              id: true,
              name: true,
            }
          }
        }
      });

      const appointmentDate = new Date(appointment.date);
      const petName = appointmentDetails?.pet?.name || 'Unknown pet';
      const clientName = appointmentDetails?.client?.name || 'Client';
      
      // Create notification for the client
      console.log('📧 Creating client notification with data:', {
        userId: appointment.clientId?.toString(),
        practiceId: appointment.practiceId?.toString(),
        appointmentId: appointment.id,
        petName,
        clientName
      });

      const clientNotificationResult = await NotificationService.createNotification({
        userId: appointment.clientId?.toString(),
        practiceId: appointment.practiceId?.toString(),
        title: 'Appointment Marked as No-Show',
        message: `Your appointment for ${petName} scheduled for ${appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} was automatically marked as no-show since the scheduled time passed without attendance.`,
        type: 'appointment',
        relatedId: appointment.id.toString(),
        relatedType: 'appointment'
      });

      console.log('📧 Client notification result:', clientNotificationResult);

      // Also create notification for practice staff
      const staffNotificationResult = await NotificationService.createNotification({
        practiceId: appointment.practiceId?.toString(),
        title: 'Appointment No-Show (Auto-marked)',
        message: `Appointment for ${clientName}'s pet ${petName} scheduled for ${appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} was automatically marked as no-show by system automation.`,
        type: 'appointment',
        recipients: ['admin', 'practitioner'],
        relatedId: appointment.id.toString(),
        relatedType: 'appointment'
      });

      if (clientNotificationResult.success) {
        console.log(`✅ Sent no-show notification to client for appointment ${appointment.id}`);
      } else {
        console.error(`❌ Failed to send client notification for appointment ${appointment.id}:`, clientNotificationResult.error);
      }

      if (staffNotificationResult.success) {
        console.log(`✅ Sent no-show notification to staff for appointment ${appointment.id}`);
      } else {
        console.error(`❌ Failed to send staff notification for appointment ${appointment.id}:`, staffNotificationResult.error);
      }

    } catch (error) {
      console.error(`❌ Error sending no-show notifications for appointment ${appointment.id}:`, error);
    }
  }

  /**
   * Get automation statistics
   */
  getStats() {
    return {
      lastRunTime: this.lastRunTime,
      uptime: process.uptime(),
      status: 'active'
    };
  }

  /**
   * Manual trigger for testing purposes
   */
  async runManually(): Promise<void> {
    console.log('🔄 Manual appointment automation trigger...');
    await this.processOverdueAppointments();
  }
}
