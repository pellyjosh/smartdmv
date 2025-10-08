import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getCurrentTenantInfo } from "@/lib/tenant-db-resolver";

// Configure API route to handle larger file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Pet Photo Upload Started ===");
    
    const formData = await request.formData();
    console.log("FormData received, entries:", Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value]));
    
    const file = formData.get("photo") as File | null;
    const practiceId = (formData.get("practiceId") as string) || "general";
    const clientId = (formData.get("clientId") as string) || "unknown";
    const petId = (formData.get("petId") as string) || "new";

    console.log("Upload parameters:", { practiceId, clientId, petId, fileSize: file?.size, fileName: file?.name });

    if (!file || !(file instanceof File)) {
      console.error("No valid file provided");
      return NextResponse.json({ error: "No photo file provided" }, { status: 400 });
    }

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

    // Get tenant information
    console.log("Getting tenant information...");
    let tenantInfo;
    try {
      tenantInfo = await getCurrentTenantInfo();
      console.log("Tenant info retrieved:", tenantInfo);
    } catch (tenantError) {
      console.error("Error getting tenant info:", tenantError);
      tenantInfo = null;
    }
    const tenantName = tenantInfo?.name || tenantInfo?.subdomain || "general";
    console.log("Using tenant name:", tenantName);

    // Build uploads directory with tenant name: /uploads/${tenantName}/${practiceId}/pets/${clientId}/
    let uploadDir = path.join(process.cwd(), "public", "uploads", tenantName, practiceId, "pets", clientId);
    let finalTenantName = tenantName;
    
    console.log("Upload directory:", uploadDir);
    
    console.log("Checking if directory exists...");
    if (!existsSync(uploadDir)) {
      console.log("Creating directory...");
      try {
        await mkdir(uploadDir, { recursive: true });
        console.log("Directory created successfully");
      } catch (dirError) {
        console.error("Failed to create tenant-specific directory:", dirError);
        // Try fallback directory without tenant name for compatibility
        console.log("Attempting fallback directory...");
        uploadDir = path.join(process.cwd(), "public", "uploads", "general", "pets", clientId);
        finalTenantName = "general";
        console.log("Fallback directory:", uploadDir);
        await mkdir(uploadDir, { recursive: true });
        console.log("Fallback directory created successfully");
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
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log("Buffer created, size:", buffer.length, "bytes");
    
    console.log("Writing file to disk...");
    await writeFile(filePath, buffer);
    console.log("File written successfully");

    // Return relative path from public/ with tenant name
    const relativePath = `/uploads/${finalTenantName}/${practiceId}/pets/${clientId}/${filename}`;
    console.log("Returning relative path:", relativePath);
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
