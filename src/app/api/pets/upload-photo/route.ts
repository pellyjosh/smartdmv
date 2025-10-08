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
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const practiceId = (formData.get("practiceId") as string) || "general";
    const clientId = (formData.get("clientId") as string) || "unknown";
    const petId = (formData.get("petId") as string) || "new";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No photo file provided" }, { status: 400 });
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB, but received ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      }, { status: 413 });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Get tenant information
    const tenantInfo = await getCurrentTenantInfo();
    const tenantName = tenantInfo?.name || tenantInfo?.subdomain || "general";

    // Build uploads directory with tenant name: /uploads/${tenantName}/${practiceId}/pets/${clientId}/
    const uploadDir = path.join(process.cwd(), "public", "uploads", tenantName, practiceId, "pets", clientId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Create unique filename
    const timestamp = Date.now();
    const original = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = original.includes(".") ? original.split(".").pop() : "bin";
    const filename = `${petId}-${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return relative path from public/ with tenant name
    const relativePath = `/uploads/${tenantName}/${practiceId}/pets/${clientId}/${filename}`;
    return NextResponse.json({ photoPath: relativePath }, { status: 201 });
  } catch (error) {
    console.error("Pet photo upload error:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
