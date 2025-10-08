import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getTenantContext } from '@/lib/tenant-context';

// Force Node.js runtime for file system operations
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log("=== Pet Photo Upload Started ===");
    console.log("Request method:", request.method);
    console.log("Content-Type:", request.headers.get('content-type'));
    console.log("Content-Length:", request.headers.get('content-length'));
    
    // Helper function to check if value is file-like (server-compatible)
    const isFilelike = (value: any): boolean => {
      return value && 
             typeof value === 'object' && 
             value !== null &&
             typeof value.name === 'string' &&
             typeof value.size === 'number' &&
             typeof value.type === 'string' &&
             typeof value.arrayBuffer === 'function';
    };
    
    // Simple approach - try to parse formdata directly
    let formData: FormData;
    try {
      console.log("Attempting to parse FormData...");
      formData = await request.formData();
      console.log("FormData parsed successfully!");
      
      // Log all entries with server-compatible checking
      const entries = Array.from(formData.entries());
      console.log("Total FormData entries:", entries.length);
      
      for (const [key, value] of entries) {
        if (isFilelike(value)) {
          const fileObj = value as any;
          console.log(`Field '${key}': File - name: ${fileObj.name}, size: ${fileObj.size}, type: ${fileObj.type}`);
        } else {
          console.log(`Field '${key}': ${String(value)}`);
        }
      }
    } catch (formError) {
      console.error("FormData parsing failed:", formError);
      return NextResponse.json({ 
        error: "Failed to parse form data", 
        details: String(formError),
        contentType: request.headers.get('content-type')
      }, { status: 400 });
    }
    
    // Get form fields
    const practiceId = formData.get("practiceId")?.toString() || "general";
    const clientId = formData.get("clientId")?.toString() || "unknown";  
    const petId = formData.get("petId")?.toString() || "new";
    const photo = formData.get("photo");
    
    console.log("Form fields:", { practiceId, clientId, petId });
    console.log("Photo field type:", typeof photo);
    console.log("Photo has file properties?", isFilelike(photo));
    
    // Validate file using server-compatible duck typing
    if (!photo) {
      console.error("No photo field found");
      return NextResponse.json({ error: "No photo field in form data" }, { status: 400 });
    }
    
    if (!isFilelike(photo)) {
      console.error("Photo field is not a file-like object:", photo);
      return NextResponse.json({ 
        error: "Photo field is not a file", 
        fieldType: typeof photo,
        hasName: photo && typeof photo === 'object' && photo !== null && 'name' in photo,
        hasSize: photo && typeof photo === 'object' && photo !== null && 'size' in photo,
        hasType: photo && typeof photo === 'object' && photo !== null && 'type' in photo
      }, { status: 400 });
    }
    
    const file = photo as any; // Type assertion since we've validated it's file-like
    console.log("File validated:", { name: file.name, size: file.size, type: file.type });

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      console.error("File too large:", file.size, "bytes");
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB, but received ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      }, { status: 413 });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return NextResponse.json({ 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Get tenant context for proper file storage
    const tenantContext = await getTenantContext();
    console.log("Tenant context:", { tenantId: tenantContext.tenantId, storagePath: tenantContext.storagePath });

    // Map tenant ID to proper display name for public uploads structure
    const getTenantDisplayName = (tenantId: string): string => {
      const tenantMapping: Record<string, string> = {
        'smartvett': 'Smart Vett',
        'smartvet': 'Smart Vett', 
        'default': 'Default',
      };
      return tenantMapping[tenantId.toLowerCase()] || tenantId;
    };

    const tenantDisplayName = getTenantDisplayName(tenantContext.tenantId);
    
    // Use existing public uploads structure: /public/uploads/{tenantName}/{practiceId}/pets/{clientId}/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantDisplayName, practiceId, 'pets', clientId);
    console.log("Upload directory (public structure):", uploadDir);
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      console.log("Creating directory...");
      try {
        await mkdir(uploadDir, { recursive: true });
        console.log("Directory created successfully");
      } catch (dirError) {
        console.error("Failed to create directory:", dirError);
        return NextResponse.json({ 
          error: "Failed to create upload directory", 
          details: String(dirError) 
        }, { status: 500 });
      }
    } else {
      console.log("Directory already exists");
    }

    // Create unique filename
    const timestamp = Date.now();
    const original = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = original.includes(".") ? original.split(".").pop() : "bin";
    const filename = `${petId}-${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    console.log("File will be saved to:", filePath);

    // Write file to disk
    console.log("Converting file to buffer...");
    let bytes: ArrayBuffer;
    let buffer: Buffer;
    
    try {
      bytes = await file.arrayBuffer();
      console.log("ArrayBuffer created, size:", bytes.byteLength, "bytes");
      buffer = Buffer.from(bytes);
      console.log("Buffer created, size:", buffer.length, "bytes");
    } catch (bufferError) {
      console.error("Failed to convert file to buffer:", bufferError);
      return NextResponse.json({ error: "Failed to process file data", details: String(bufferError) }, { status: 500 });
    }
    
    console.log("Writing file to disk...");
    try {
      await writeFile(filePath, buffer);
      console.log("File written successfully");
    } catch (writeError) {
      console.error("Failed to write file:", writeError);
      return NextResponse.json({ error: "Failed to save file", details: String(writeError) }, { status: 500 });
    }

    // Return public uploads path that matches existing structure
    const relativePath = `/uploads/${tenantDisplayName}/${practiceId}/pets/${clientId}/${filename}`;
    console.log("Returning public uploads path:", relativePath);
    console.log("=== Pet Photo Upload Completed Successfully ===");
    
    return NextResponse.json({ photoPath: relativePath }, { status: 201 });
  } catch (error) {
    console.error("=== Pet Photo Upload Error ===");
    console.error("Error details:", error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json({ error: "Failed to upload photo", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
