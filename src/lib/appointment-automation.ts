import { db } from "@/db/index";
import { appointments, notifications } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * Appointment Automation Service
 * Handles automatic status updates for appointments based on time and business rules
 */
export class AppointmentAutomationService {
  private static instance: AppointmentAutomationService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): AppointmentAutomationService {
    if (!AppointmentAutomationService.instance) {
      AppointmentAutomationService.instance = new AppointmentAutomationService();
    }
    return AppointmentAutomationService.instance;
  }

  /**
   * Start the automation service with specified interval
   * @param intervalMinutes - How often to check for missed appointments (default: 5 minutes)
   */
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('⚠️  Appointment automation is already running');
      return;
    }

    console.log(`🤖 Starting appointment automation service (checking every ${intervalMinutes} minutes)`);
    
    // Run immediately on start
    this.checkMissedAppointments();
    
    // Set up recurring checks
    this.intervalId = setInterval(() => {
      this.checkMissedAppointments();
    }, intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
  }

  /**
   * Stop the automation service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Appointment automation service stopped');
  }

  /**
   * Check for missed appointments and update their status to no_show
   */
  async checkMissedAppointments(): Promise<void> {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes grace period
      
      console.log(`🔍 Checking for missed appointments (cutoff: ${cutoffTime.toISOString()})`);

      // Find appointments that should be marked as no-show
      const missedAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.status, 'scheduled'), // Only scheduled appointments
          lt(appointments.date, cutoffTime)     // Past the cutoff time
        ),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
              email: true,
            }
          },
          pet: {
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
          },
          practitioner: {
            columns: {
              id: true,
              name: true,
            }
          }
        }
      });

      if (missedAppointments.length === 0) {
        console.log('✅ No missed appointments found');
        return;
      }

      console.log(`📋 Found ${missedAppointments.length} missed appointments to update`);

      // Update each missed appointment
      for (const appointment of missedAppointments) {
        try {
          await this.updateAppointmentToNoShow(appointment);
          console.log(`✅ Updated appointment ${appointment.id} to no-show status`);
        } catch (error) {
          console.error(`❌ Failed to update appointment ${appointment.id}:`, error);
        }
      }

      console.log(`🎯 Automation check completed. Updated ${missedAppointments.length} appointments`);
    } catch (error) {
      console.error('❌ Error in appointment automation check:', error);
    }
  }

  /**
   * Update a specific appointment to no-show status and send notifications
   */
  private async updateAppointmentToNoShow(appointment: any): Promise<void> {
    const appointmentDate = new Date(appointment.date);
    
    // Update appointment status
    await db.update(appointments)
      .set({
        status: 'no_show',
        updatedAt: new Date(),
        notes: appointment.notes ? 
          `${appointment.notes}\n\nAutomatically marked as no-show on ${new Date().toISOString()} - appointment time passed without attendance` :
          `Automatically marked as no-show on ${new Date().toISOString()} - appointment time passed without attendance`
      })
      .where(eq(appointments.id, appointment.id));

    // Send notification to practice/admin users
    try {
      await this.sendNoShowNotifications(appointment);
    } catch (error) {
      console.error(`Failed to send no-show notifications for appointment ${appointment.id}:`, error);
      // Don't fail the main update if notification fails
    }
  }

  /**
   * Send notifications about no-show appointments
   */
  private async sendNoShowNotifications(appointment: any): Promise<void> {
    const appointmentDate = new Date(appointment.date);
    
    // Find all admin and practitioner users in the same practice
    const practiceUsers = await db.query.users.findMany({
      where: and(
        eq(db.query.users.practiceId || db.query.users.currentPracticeId, appointment.practiceId),
        // Assuming you have a role field that indicates admin or practitioner
        // Adjust this query based on your actual user schema
      ),
      columns: {
        id: true,
        name: true,
        role: true,
      }
    });

    const adminAndPractitionerUsers = practiceUsers.filter(user => 
      user.role === 'ADMIN' || 
      user.role === 'PRACTICE_OWNER' || 
      user.role === 'VETERINARIAN' || 
      user.role === 'VETERINARY_TECHNICIAN'
    );

    // Create notifications for each relevant user
    for (const user of adminAndPractitionerUsers) {
      await db.insert(notifications).values({
        userId: user.id,
        title: 'Appointment No-Show (Auto-detected)',
        message: `Appointment for ${appointment.pet?.name || 'pet'} (Client: ${appointment.client?.name || 'Unknown'}) scheduled for ${appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} was automatically marked as no-show due to missed appointment time.`,
        type: 'appointment',
        read: false,
        relatedEntityId: appointment.id.toString(),
        relatedEntityType: 'appointment',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`📧 Sent no-show notifications to ${adminAndPractitionerUsers.length} practice staff members`);
  }

  /**
   * Manual trigger for checking missed appointments (useful for testing)
   */
  async runManualCheck(): Promise<{ updated: number; message: string }> {
    try {
      const beforeCount = await this.getMissedAppointmentsCount();
      await this.checkMissedAppointments();
      const afterCount = await this.getMissedAppointmentsCount();
      const updated = beforeCount - afterCount;
      
      return {
        updated,
        message: `Manual check completed. Updated ${updated} appointments to no-show status.`
      };
    } catch (error) {
      console.error('Manual check failed:', error);
      return {
        updated: 0,
        message: `Manual check failed: ${error.message}`
      };
    }
  }

  /**
   * Get count of appointments that should be marked as no-show
   */
  private async getMissedAppointmentsCount(): Promise<number> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes grace period
    
    const missedAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.status, 'scheduled'),
        lt(appointments.date, cutoffTime)
      )
    });
    
    return missedAppointments.length;
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; intervalId: string | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId ? 'active' : null
    };
  }
}

export default AppointmentAutomationService;
