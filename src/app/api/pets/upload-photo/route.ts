import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

    // Build uploads directory inside public so paths are web-accessible
    const uploadDir = path.join(process.cwd(), "public", "uploads", practiceId, "pets", clientId);
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

    // Return relative path from public/
    const relativePath = `/uploads/${practiceId}/pets/${clientId}/${filename}`;
    return NextResponse.json({ photoPath: relativePath }, { status: 201 });
  } catch (error) {
    console.error("Pet photo upload error:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
