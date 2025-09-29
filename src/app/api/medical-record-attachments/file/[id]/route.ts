import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';

import { medicalRecordAttachments } from '@/db/schema'
import { eq } from 'drizzle-orm'

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const attachmentId = parseInt(id, 10);
    
    if (isNaN(attachmentId)) {
      return NextResponse.json(
        { error: "Invalid attachment ID" },
        { status: 400 }
      );
    }
    
    console.log(`Serving file for attachment ID: ${attachmentId}`);
    
    // Get the attachment record from database
    let attachment;
    if (isSqlite) {
      attachment = await (db as any).get(`
        SELECT * FROM medical_record_attachments WHERE id = ?
      `, [attachmentId]);
    } else {
      // PostgreSQL using Drizzle ORM
      const result = await tenantDb.query.medicalRecordAttachments.findFirst({
        where: eq(medicalRecordAttachments.id, attachmentId)
      });
      attachment = result;
    }
    
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }
    
    // Check if file exists
    if (!existsSync(attachment.filePath)) {
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }
    
    // Read and serve the file
    const fileBuffer = await readFile(attachment.filePath);
    const headers = new Headers();
    headers.set("Content-Type", attachment.fileType || "application/octet-stream");
    
    // Properly encode filename to handle non-ASCII characters
    const encodedFilename = encodeURIComponent(attachment.fileName);
    const dispositionType = attachment.fileType && attachment.fileType.startsWith('image/') ? 'inline' : 'attachment';
    
    // Use RFC 5987 encoding for filenames with non-ASCII characters
    headers.set("Content-Disposition", `${dispositionType}; filename*=UTF-8''${encodedFilename}`);
    
    return new NextResponse(fileBuffer, { headers });

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
