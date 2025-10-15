import { NextRequest, NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payrollReports } from "@/db/schemas/financeSchema";
import { eq, and } from "drizzle-orm";

// GET /api/practices/[practiceId]/payroll/reports/[reportId]/download
export async function GET(
  request: NextRequest,
  context: { 
    params: Promise<{ practiceId: string; reportId: string }> | { practiceId: string; reportId: string } 
  }
) {
  try {
    const resolvedParams = await context.params as { practiceId: string; reportId: string };
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const practiceId = Number(resolvedParams.practiceId);
    const reportId = Number(resolvedParams.reportId);
    
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Get the report
    const [report] = await tenantDb.select()
      .from(payrollReports)
      .where(and(
        eq(payrollReports.id, reportId),
        eq(payrollReports.practiceId, practiceId)
      ))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status !== 'completed') {
      return NextResponse.json({ error: 'Report is not ready for download' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || report.exportFormat || 'pdf';

    // Generate the file content based on format
    const fileContent = await generateFileContent(report, format);
    const fileName = generateFileName(report, format);
    const mimeType = getMimeType(format);

    return new NextResponse(new Uint8Array(fileContent), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download report' },
      { status: 500 }
    );
  }
}

async function generateFileContent(report: any, format: string): Promise<Buffer> {
  const reportData = JSON.parse(report.reportData);
  
  switch (format.toLowerCase()) {
    case 'csv':
      return Buffer.from(generateCSV(report, reportData), 'utf-8');
    case 'excel':
      return generateExcel(report, reportData);
    case 'pdf':
    default:
      return generatePDF(report, reportData);
  }
}

function generateCSV(report: any, reportData: any): string {
  let csv = `${report.title}\n`;
  csv += `Generated on: ${new Date(report.createdAt).toLocaleDateString()}\n`;
  csv += `Report Type: ${report.reportType}\n\n`;

  if (reportData.summary) {
    csv += `Summary:\n`;
    Object.entries(reportData.summary).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    csv += '\n';
  }

  if (reportData.details && Array.isArray(reportData.details)) {
    if (reportData.details.length > 0) {
      // Add headers
      const headers = Object.keys(reportData.details[0]);
      csv += headers.join(',') + '\n';
      
      // Add data rows
      reportData.details.forEach((row: any) => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csv += values.join(',') + '\n';
      });
    }
  }

  return csv;
}

function generateExcel(report: any, reportData: any): Buffer {
  // For now, return CSV content as Excel (would need xlsx library for proper Excel)
  // In a real implementation, you'd use a library like 'xlsx' or 'exceljs'
  const csvContent = generateCSV(report, reportData);
  return Buffer.from(csvContent, 'utf-8');
}

function generatePDF(report: any, reportData: any): Buffer {
  // For now, return HTML content as text (would need puppeteer or similar for PDF)
  // In a real implementation, you'd use a library like 'puppeteer' or 'jspdf'
  let content = `${report.title}\n`;
  content += `Generated on: ${new Date(report.createdAt).toLocaleDateString()}\n`;
  content += `Report Type: ${report.reportType}\n\n`;

  if (reportData.summary) {
    content += `Summary:\n`;
    Object.entries(reportData.summary).forEach(([key, value]) => {
      content += `${key}: ${value}\n`;
    });
    content += '\n';
  }

  if (reportData.details && Array.isArray(reportData.details)) {
    content += `Details (${reportData.details.length} records):\n`;
    reportData.details.forEach((item: any, index: number) => {
      content += `${index + 1}. ${JSON.stringify(item, null, 2)}\n`;
    });
  }

  return Buffer.from(content, 'utf-8');
}

function generateFileName(report: any, format: string): string {
  const sanitizedTitle = report.title.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().split('T')[0];
  const extension = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();
  return `${sanitizedTitle}_${date}.${extension}`;
}

function getMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case 'csv':
      return 'text/csv';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}