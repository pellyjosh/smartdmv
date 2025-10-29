import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getCurrentTenantDb } from "@/lib/tenant-db-resolver";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
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

    // Perform soft delete by setting isActive to false and deletedAt timestamp
    await tenantDb
      .update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(user.id)));

    // Delete all user sessions to log them out
    await tenantDb
      .delete(sessions)
      .where(eq(sessions.userId, parseInt(user.id)));

    console.log(`[SOFT DELETE] User account soft deleted: ${user.email} (ID: ${user.id})`);

    return NextResponse.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error soft deleting account:", error);
    return NextResponse.json(
      { error: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
