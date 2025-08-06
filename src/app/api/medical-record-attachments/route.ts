import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { db } from '@/db/index'

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const recordType = formData.get("recordType") as string;
    const recordId = formData.get("recordId") as string;
    const petId = formData.get("petId") as string || "";
    const practiceId = formData.get("practiceId") as string || "";
    const uploadedById = formData.get("uploadedById") as string || "";
    const description = formData.get("description") as string || "";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (!recordType || !recordId) {
      return NextResponse.json(
        { error: "Record type and ID are required" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "uploads", recordType, recordId);
    
    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (file instanceof File) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(uploadDir, filename);
        
        await writeFile(filepath, buffer);
        
        // Save to database
        const attachmentId = `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        if (isSqlite) {
          await (db as any).run(`
            INSERT INTO medical_record_attachments (
              id, file_name, file_type, file_size, file_path, uploaded_by_id,
              pet_id, practice_id, record_type, record_id, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            attachmentId,
            file.name,
            file.type,
            file.size,
            filepath,
            uploadedById,
            petId,
            practiceId,
            recordType,
            recordId,
            description
          ])
          
          // Get the created attachment
          const createdAttachment = await (db as any).get(`
            SELECT * FROM medical_record_attachments WHERE id = ?
          `, [attachmentId])
          
          uploadedFiles.push(createdAttachment);
        } else {
          // PostgreSQL would use Drizzle ORM here
          throw new Error('PostgreSQL medical record attachments not implemented yet')
        }
      }
    }

    return NextResponse.json({
      message: "Files uploaded successfully",
      files: uploadedFiles
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
