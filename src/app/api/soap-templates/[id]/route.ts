// src/app/api/soap-templates/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapTemplates } from "@/db/schemas/soapNoteTemplateSchema";
import { z } from "zod";
import { eq } from "drizzle-orm";

// Schema for partial updates (PATCH)
const soapTemplatePartialSchema = z.object({
  name: z.string().min(1, "Template name cannot be empty").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  speciesApplicability: z.array(z.string()).optional(),
  subjective_template: z.string().optional(),
  objective_template: z.string().optional(),
  assessment_template: z.string().optional(),
  plan_template: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// GET /api/soap-templates/[id] - Fetch a specific SOAP template
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const template = await db.query.soapTemplates.findFirst({
      where: eq(soapTemplates.id, id)
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching SOAP template:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOAP template" },
      { status: 500 }
    );
  }
}

// PATCH /api/soap-templates/[id] - Update a SOAP template
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    // Validate data using Zod schema
    const validationResult = soapTemplatePartialSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    console.log("Updating SOAP template with data:", validatedData);
    
    // Update in database, disregarding TypeScript errors as per project pattern
    // @ts-ignore
    const [updatedTemplate] = await db
      .update(soapTemplates)
      .set(validatedData)
      .where(eq(soapTemplates.id, id))
      .returning();

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      ...updatedTemplate,
      message: "SOAP template updated successfully"
    });
  } catch (error) {
    console.error("Error updating SOAP template:", error);
    return NextResponse.json(
      { error: "Failed to update SOAP template" },
      { status: 500 }
    );
  }
}

// DELETE /api/soap-templates/[id] - Delete a SOAP template
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    // Check if template exists first
    const existingTemplate = await db.query.soapTemplates.findFirst({
      where: eq(soapTemplates.id, id)
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Delete the template, disregarding TypeScript errors as per project pattern
    // @ts-ignore
    await db.delete(soapTemplates).where(eq(soapTemplates.id, id));
    
    return NextResponse.json({
      message: "SOAP template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting SOAP template:", error);
    return NextResponse.json(
      { error: "Failed to delete SOAP template" },
      { status: 500 }
    );
  }
}
