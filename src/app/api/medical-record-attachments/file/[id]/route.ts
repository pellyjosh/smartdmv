import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // In a real application, you would query the database to get the file path
    // For now, return a placeholder response
    
    // Mock file path (in real app, get from database)
    const mockFilePath = path.join(process.cwd(), "uploads", "soap-note", "9", `file-${id}.pdf`);
    
    // Check if file exists (for real files)
    if (existsSync(mockFilePath)) {
      const fileBuffer = await readFile(mockFilePath);
      const headers = new Headers();
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", `attachment; filename="file-${id}.pdf"`);
      
      return new NextResponse(fileBuffer, { headers });
    }
    
    // Return a placeholder for demo purposes
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
