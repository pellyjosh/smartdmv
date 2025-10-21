import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getTenantContext } from '@/lib/tenant-context';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for file system operations
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    console.log("=== Practice Logo Upload Started ===");
    console.log("Request method:", request.method);

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

    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
      console.log("FormData parsed successfully!");
    } catch (formError) {
      console.error("FormData parsing failed:", formError);
      return NextResponse.json({
        error: "Failed to parse form data",
        details: String(formError)
      }, { status: 400 });
    }

    // Get form fields
    const logo = formData.get("logo");

    console.log("Logo field type:", typeof logo);
    console.log("Logo has file properties?", isFilelike(logo));

    // Validate file
    if (!logo) {
      console.error("No logo field found");
      return NextResponse.json({ error: "No logo field in form data" }, { status: 400 });
    }

    if (!isFilelike(logo)) {
      console.error("Logo field is not a file-like object:", logo);
      return NextResponse.json({
        error: "Logo field is not a file",
        fieldType: typeof logo
      }, { status: 400 });
    }

    const file = logo as any;
    console.log("File validated:", { name: file.name, size: file.size, type: file.type });

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`
      }, { status: 413 });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      }, { status: 400 });
    }

    // Get practice ID from params
    const resolvedParams = await params;
    const practiceId = resolvedParams.practiceId;

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

    // Use existing public uploads structure: /public/uploads/{tenantName}/{practiceId}/logos/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantDisplayName, practiceId, 'logos');
    console.log("Upload directory:", uploadDir);

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
    }

    // Create unique filename
    const timestamp = Date.now();
    const original = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = original.includes(".") ? original.split(".").pop() : "bin";
    const filename = `logo-${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    console.log("File will be saved to:", filePath);

    // Write file to disk
    console.log("Converting file to buffer...");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log("Writing file to disk...");
    try {
      await writeFile(filePath, buffer);
      console.log("File written successfully");
    } catch (writeError) {
      console.error("Failed to write file:", writeError);
      return NextResponse.json({ error: "Failed to save file", details: String(writeError) }, { status: 500 });
    }

    // Return public uploads path
    const relativePath = `/uploads/${tenantDisplayName}/${practiceId}/logos/${filename}`;
    console.log("Returning public uploads path:", relativePath);

    // Update the database with the logo path
    try {
      const tenantDb = await getCurrentTenantDb();
      await tenantDb
        .update(practices)
        .set({ logoPath: relativePath })
        .where(eq(practices.id, parseInt(practiceId, 10)));
      console.log("Database updated with logo path");
    } catch (dbError) {
      console.error("Failed to update database with logo path:", dbError);
      // Don't fail the upload if database update fails, just log it
    }

    console.log("=== Practice Logo Upload Completed Successfully ===");

    return NextResponse.json({
      logoPath: relativePath,
      filename: filename
    }, { status: 201 });
  } catch (error) {
    console.error("=== Practice Logo Upload Error ===");
    console.error("Error details:", error);
    return NextResponse.json({
      error: "Failed to upload logo",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    console.log("=== Practice Logo Delete Started ===");

    // Get practice ID from params
    const resolvedParams = await params;
    const practiceId = resolvedParams.practiceId;

    // Get tenant context
    const tenantContext = await getTenantContext();

    // Map tenant ID to proper display name
    const getTenantDisplayName = (tenantId: string): string => {
      const tenantMapping: Record<string, string> = {
        'smartvett': 'Smart Vett',
        'smartvet': 'Smart Vett',
        'default': 'Default',
      };
      return tenantMapping[tenantId.toLowerCase()] || tenantId;
    };

    const tenantDisplayName = getTenantDisplayName(tenantContext.tenantId);

    // Update the database to remove the logo path
    try {
      const tenantDb = await getCurrentTenantDb();
      await tenantDb
        .update(practices)
        .set({ logoPath: null })
        .where(eq(practices.id, parseInt(practiceId, 10)));
      console.log("Database updated to remove logo path");
    } catch (dbError) {
      console.error("Failed to update database to remove logo path:", dbError);
      // Don't fail the deletion if database update fails, just log it
    }

    console.log("Logo delete completed successfully");
    console.log("=== Practice Logo Delete Completed ===");

    return NextResponse.json({
      message: "Logo reference removed successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("=== Practice Logo Delete Error ===");
    console.error("Error details:", error);
    return NextResponse.json({
      error: "Failed to delete logo",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
