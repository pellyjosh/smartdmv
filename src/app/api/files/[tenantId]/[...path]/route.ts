// src/app/api/files/[tenantId]/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext, getTenantStoragePath } from '@/lib/tenant-context';
import { getCurrentUser } from '@/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';
import { lookup } from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; path: string[]  }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext();
    
    // Verify user has access to this tenant
    if (tenantContext.tenantId !== resolvedParams.tenantId && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Construct file path
    const filePath = getTenantStoragePath(tenantContext, ...resolvedParams.path);
    
    try {
      const fileBuffer = await readFile(filePath);
      const filename = path.basename(resolvedParams.path[resolvedParams.path.length - 1]);
      const mimeType = lookup(filename) || 'application/octet-stream';
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
      
    } catch (fileError) {
      console.error('File not found:', filePath);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
