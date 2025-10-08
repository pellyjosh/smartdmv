import { NextRequest, NextResponse } from "next/server";

// Simple test endpoint to verify file upload functionality
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log("=== Test Upload Endpoint ===");
    
    const contentType = request.headers.get('content-type') || '';
    console.log("Content-Type:", contentType);
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }
    
    const formData = await request.formData();
    const entries = Array.from(formData.entries());
    
    console.log("FormData entries:", entries.map(([key, value]) => ({
      key,
      valueType: typeof value,
      isFile: value instanceof File,
      ...(value instanceof File ? {
        name: value.name,
        size: value.size,
        type: value.type
      } : { value: String(value) })
    })));
    
    return NextResponse.json({ 
      success: true, 
      entriesCount: entries.length,
      entries: entries.map(([key, value]) => ({
        key,
        isFile: value instanceof File,
        ...(value instanceof File ? {
          name: value.name,
          size: value.size,
          type: value.type
        } : { value: String(value) })
      }))
    });
    
  } catch (error) {
    console.error("Test upload error:", error);
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}