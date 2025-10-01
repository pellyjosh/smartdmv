// src/app/api/soap-notes/[id]/lock/route.ts
import { NextResponse } from "next/server";
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { eq } from "drizzle-orm";

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Utility function for database-agnostic timestamp handling
const getTimestamp = () => isSqlite ? new Date().getTime() : new Date();

// POST /api/soap-notes/[id]/lock - Lock a SOAP note
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const resolvedParams = await params;
    const soapNoteId = parseInt(resolvedParams.id);
    
    if (isNaN(soapNoteId)) {
      return NextResponse.json(
        { error: "Invalid SOAP note ID" },
        { status: 400 }
      );
    }

    // Check if the SOAP note exists
    const soapNote = await tenantDb.query.soapNotes.findFirst({
      where: eq(soapNotes.id, soapNoteId)
    });

    if (!soapNote) {
      return NextResponse.json(
        { error: "SOAP note not found" },
        { status: 404 }
      );
    }

    if (soapNote.locked) {
      return NextResponse.json(
        { error: "SOAP note is already locked" },
        { status: 400 }
      );
    }

    // Lock the SOAP note - let Drizzle handle database-specific conversions
    // @ts-ignore
    const [updatedSoapNote] = await tenantDb.update(soapNotes)
      .set({ 
        locked: true,
        updatedAt: new Date()
      })
      .where(eq(soapNotes.id, soapNoteId))
      .returning();

    return NextResponse.json(
      { 
        ...updatedSoapNote,
        message: "SOAP note locked successfully" 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Error locking SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to lock SOAP note" },
      { status: 500 }
    );
  }
}
