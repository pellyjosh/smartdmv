import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { sql } from 'drizzle-orm';

import { medicalRecordAttachments, practices, soapNotes, pets } from '@/db/schema'
import { eq } from 'drizzle-orm'

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    // Get practice name from database if practiceId is provided
    let practiceFolder = "default-practice";
    if (practiceId) {
      try {
        if (isSqlite) {
          const practiceResult: any = await tenantDb.execute(sql.raw(`SELECT name FROM practices WHERE id = ?`), [parseInt(practiceId, 10)]);
          const row = Array.isArray(practiceResult) ? practiceResult[0] : (practiceResult.rows ? practiceResult.rows[0] : undefined);
          const practiceResultNormalized = row || practiceResult;
          if (practiceResultNormalized && (practiceResultNormalized as any).name) {
            // Sanitize practice name for folder usage (remove special characters)
            practiceFolder = String((practiceResultNormalized as any).name).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
          }
        } else {
          const practiceResult = await tenantDb.query.practices.findFirst({
            where: eq(practices.id, parseInt(practiceId, 10)),
            columns: {
              name: true,
            },
          });
          
          if (practiceResult && practiceResult.name) {
            // Sanitize practice name for folder usage (remove special characters)
            practiceFolder = String(practiceResult.name).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
          }
        }
      } catch (error) {
        console.error("Error fetching practice name:", error);
        // Fall back to practiceId if name lookup fails
        practiceFolder = practiceId;
      }
    }

    // Create directory structure based on record type
    let uploadDir: string;
    
    if (recordType === "soap-note") {
      // For SOAP notes, include pet name in directory structure
      // Structure: uploads/{practiceName}/soap-note/{petName}_{soapNoteId}/
      let petName = "unknown_pet";
      
      try {
        // Fetch SOAP note to get pet ID
        let soapNote;
        if (isSqlite) {
          const soapNoteResult: any = await tenantDb.execute(sql.raw(`SELECT petId FROM soap_notes WHERE id = ?`), [parseInt(recordId, 10)]);
          soapNote = Array.isArray(soapNoteResult) ? soapNoteResult[0] : (soapNoteResult.rows ? soapNoteResult.rows[0] : undefined);
        } else {
          const soapNoteResult = await tenantDb.query.soapNotes.findFirst({
            where: eq(soapNotes.id, parseInt(recordId, 10)),
            columns: {
              petId: true,
            },
          });
          soapNote = soapNoteResult;
        }
        
        if (soapNote && soapNote.petId) {
          // Fetch pet name
          let pet;
          if (isSqlite) {
            const petResult: any = await tenantDb.execute(sql.raw(`SELECT name FROM pets WHERE id = ?`), [parseInt(soapNote.petId.toString(), 10)]);
            pet = Array.isArray(petResult) ? petResult[0] : (petResult.rows ? petResult.rows[0] : undefined);
          } else {
            const petResult = await tenantDb.query.pets.findFirst({
              where: eq(pets.id, parseInt(soapNote.petId.toString(), 10)),
              columns: {
                name: true,
              },
            });
            pet = petResult;
          }
          
          if (pet && pet.name) {
            petName = String(pet.name).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
          }
        }
      } catch (error) {
        console.error("Error fetching SOAP note or pet details:", error);
      }
      
      const folderName = `${petName}_${recordId}`;
      uploadDir = path.join(process.cwd(), "uploads", practiceFolder, recordType, folderName);
    } else {
      // For other record types, use original structure
      // Structure: uploads/{practiceName}/{recordType}/{recordId}/
      uploadDir = path.join(process.cwd(), "uploads", practiceFolder, recordType, recordId);
    }
    
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
          await tenantDb.execute(sql.raw(`INSERT INTO medical_record_attachments (
              id, file_name, file_type, file_size, file_path, uploaded_by_id,
              pet_id, practice_id, record_type, record_id, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`), [
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
          ]);
          const createdAttachmentResult: any = await tenantDb.execute(sql.raw(`SELECT * FROM medical_record_attachments WHERE id = ?`), [attachmentId]);
          const createdAttachment = Array.isArray(createdAttachmentResult) ? createdAttachmentResult[0] : (createdAttachmentResult.rows ? createdAttachmentResult.rows[0] : undefined);
          uploadedFiles.push(createdAttachment);
        } else {
          // PostgreSQL implementation using Drizzle ORM
          // @ts-ignore - Drizzle ORM type issue with multi-database support
          const [createdAttachment] = await tenantDb.insert(medicalRecordAttachments).values({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            filePath: filepath,
            uploadedById: uploadedById || 'unknown',
            petId: petId || '',
            practiceId: practiceId || '',
            recordType: recordType,
            recordId: recordId,
            description: description || null,
          }).returning();
          
          uploadedFiles.push(createdAttachment);
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
