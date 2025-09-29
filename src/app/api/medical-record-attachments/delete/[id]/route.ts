import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';

import { medicalRecordAttachments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { existsSync } from "fs";

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    
    console.log(`Deleting attachment with ID: ${id}`);
    
    // First, get the attachment record to find the file path
    let attachment;
    if (isSqlite) {
      attachment = await (db as any).get(`
        SELECT * FROM medical_record_attachments WHERE id = ?
      `, [id]);
    } else {
      // PostgreSQL using Drizzle ORM
      const result = await tenantDb.query.medicalRecordAttachments.findFirst({
        where: eq(medicalRecordAttachments.id, id)
      });
      attachment = result;
    }
    
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }
    
    // Delete the physical file if it exists
    if (attachment.filePath && existsSync(attachment.filePath)) {
      try {
        await unlink(attachment.filePath);
        console.log(`Physical file deleted: ${attachment.filePath}`);
      } catch (fileError) {
        console.warn(`Could not delete physical file: ${attachment.filePath}`, fileError);
      }
    }
    
    // Delete the database record
    if (isSqlite) {
      await (db as any).run(`
        DELETE FROM medical_record_attachments WHERE id = ?
      `, [id]);
    } else {
      // PostgreSQL using Drizzle ORM
      await tenantDb.delete(medicalRecordAttachments)
        .where(eq(medicalRecordAttachments.id, id));
    }
    
    return NextResponse.json({
      message: "Attachment deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
