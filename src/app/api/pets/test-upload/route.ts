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
    
    // Helper function to check if value is file-like
    const isFilelike = (value: any): boolean => {
      return value && 
             typeof value === 'object' && 
             'name' in value && 
             'size' in value && 
             'type' in value &&
             'arrayBuffer' in value;
    };
    
    console.log("FormData entries:", entries.map(([key, value]) => ({
      key,
      valueType: typeof value,
      isFile: isFilelike(value),
      ...(isFilelike(value) ? {
        name: (value as any).name,
        size: (value as any).size,
        type: (value as any).type
      } : { value: String(value) })
    })));
    
    return NextResponse.json({ 
      success: true, 
      entriesCount: entries.length,
      entries: entries.map(([key, value]) => ({
        key,
        isFile: isFilelike(value),
        ...(isFilelike(value) ? {
          name: (value as any).name,
          size: (value as any).size,
          type: (value as any).type
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