// src/app/api/soap-notes/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const recordType = formData.get("recordType") as string;
    const recordId = formData.get("recordId") as string;
    const practiceId = formData.get("practiceId") as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = [];
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Create practice-specific directory
    const practiceDir = join(uploadsDir, practiceId || "general");
    if (!existsSync(practiceDir)) {
      await mkdir(practiceDir, { recursive: true });
    }

    // Create SOAP notes directory
    const soapNotesDir = join(practiceDir, "soap-notes");
    if (!existsSync(soapNotesDir)) {
      await mkdir(soapNotesDir, { recursive: true });
    }

    for (const file of files) {
      if (!file.name) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = join(soapNotesDir, fileName);

      // Write file to uploads directory
      await writeFile(filePath, buffer);

      // Return file info (in a real app, you'd save this to database)
      uploadedFiles.push({
        id: timestamp, // In real app, this would be a database ID
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: `/uploads/${practiceId || "general"}/soap-notes/${fileName}`,
        recordType,
        recordId: recordId ? parseInt(recordId) : null
      });
    }

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully` 
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
