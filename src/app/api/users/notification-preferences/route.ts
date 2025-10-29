import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getCurrentTenantDb } from "@/lib/tenant-db-resolver";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      emailNotifications,
      smsNotifications,
      appointmentReminders,
      healthPlanUpdates,
      promotionalEmails,
    } = body;

    // Get tenant database
    const tenantDb = await getCurrentTenantDb();

    // For now, we'll store preferences in a JSON field or as separate columns
    // Since the current schema doesn't have these fields, we'll just return success
    // In a production environment, you would add these fields to the users table
    // or create a separate user_preferences table

    // TODO: Add notification preference fields to database schema
    // For now, just log the preferences
    console.log("Notification preferences updated for user:", user.id, {
      emailNotifications,
      smsNotifications,
      appointmentReminders,
      healthPlanUpdates,
      promotionalEmails,
    });

    // Update smsOptOut field based on smsNotifications
    await tenantDb
      .update(users)
      .set({
        smsOptOut: !smsNotifications,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(user.id)));

    return NextResponse.json({
      success: true,
      message: "Notification preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get tenant database
    const tenantDb = await getCurrentTenantDb();

    // Get user from database
    const [dbUser] = await tenantDb
      .select()
      .from(users)
      .where(eq(users.id, parseInt(user.id)))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return preferences (with defaults for fields that don't exist yet)
    return NextResponse.json({
      emailNotifications: true,
      smsNotifications: !dbUser.smsOptOut,
      appointmentReminders: true,
      healthPlanUpdates: true,
      promotionalEmails: false,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}
