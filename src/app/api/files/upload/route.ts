// src/app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext, getTenantStoragePath } from '@/lib/tenant-context';
import { getCurrentUser } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext();
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const practiceId = formData.get('practiceId') as string;
    const category = formData.get('category') as string || 'uploads';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${nanoid()}${fileExtension}`;
    
    // Determine storage path based on practice
    let storagePath: string;
    if (practiceId) {
      storagePath = getTenantStoragePath(tenantContext, 'practices', practiceId, category);
    } else {
      storagePath = getTenantStoragePath(tenantContext, category);
    }
    
    const filePath = path.join(storagePath, uniqueFilename);
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write file
    await writeFile(filePath, buffer);
    
    // Generate file URL for serving
    const fileUrl = practiceId 
      ? `/api/files/${tenantContext.tenantId}/practices/${practiceId}/${category}/${uniqueFilename}`
      : `/api/files/${tenantContext.tenantId}/${category}/${uniqueFilename}`;
    
    return NextResponse.json({
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      url: fileUrl,
      practiceId,
      category,
      tenantId: tenantContext.tenantId
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
