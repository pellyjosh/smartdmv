// src/app/api/soap-templates/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapTemplates } from "@/db/schemas/soapNoteTemplateSchema";
import { z } from "zod";
import { eq, desc, and, like } from "drizzle-orm";

// Define the schema for SOAP template validation using Zod
const soapTemplateSchema = z.object({
  name: z.string({
    required_error: "Template name is required"
  }).min(1, "Template name cannot be empty"),
  description: z.string().optional(),
  category: z.string().optional(),
  speciesApplicability: z.array(z.string()).optional(),
  subjective_template: z.string().optional(),
  objective_template: z.string().optional(),
  assessment_template: z.string().optional(),
  plan_template: z.string().optional(),
  isDefault: z.boolean().default(false),
  practiceId: z.string({
    required_error: "Practice ID is required"
  }),
  createdById: z.string({
    required_error: "Created by ID is required"
  }),
});

// Schema for partial updates (PATCH)
const soapTemplatePartialSchema = soapTemplateSchema.partial();

// GET /api/soap-templates - Fetch all SOAP templates with filtering options
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get("practiceId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const species = searchParams.get("species");
    const limit = searchParams.get("limit");

    // Build where conditions
    const conditions = [];
    
    if (practiceId) {
      conditions.push(eq(soapTemplates.practiceId, practiceId));
    }
    
    if (category) {
      conditions.push(eq(soapTemplates.category, category));
    }
    
    if (search) {
      // Search in name, description, and template fields
      const searchCondition = like(soapTemplates.name, `%${search}%`);
      conditions.push(searchCondition);
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query with conditions
    const queryOptions: any = {
      orderBy: [desc(soapTemplates.createdAt)] // Always order by newest first
    };

    if (whereClause) {
      queryOptions.where = whereClause;
    }

    if (limit) {
      queryOptions.limit = parseInt(limit);
    }

    const templates = await db.query.soapTemplates.findMany(queryOptions);
    
    // Filter by species if provided (since species is stored as array)
    let filteredTemplates = templates;
    if (species) {
      filteredTemplates = templates.filter(template => 
        !template.speciesApplicability || 
        template.speciesApplicability.includes(species)
      );
    }
    
    return NextResponse.json(filteredTemplates);
  } catch (error) {
    console.error("Error fetching SOAP templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOAP templates" },
      { status: 500 }
    );
  }
}

// POST /api/soap-templates - Create a new SOAP template
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate data using Zod schema
    const validationResult = soapTemplateSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    // Data is valid, use it
    const validatedData = validationResult.data;
    console.log("Creating new SOAP template with data:", validatedData);
    
    // Insert into database, disregarding TypeScript errors as per project pattern
    // @ts-ignore
    const [newTemplate] = await db.insert(soapTemplates).values({
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category,
      speciesApplicability: validatedData.speciesApplicability,
      subjective_template: validatedData.subjective_template,
      objective_template: validatedData.objective_template,
      assessment_template: validatedData.assessment_template,
      plan_template: validatedData.plan_template,
      isDefault: validatedData.isDefault,
      practiceId: validatedData.practiceId,
      createdById: validatedData.createdById,
    }).returning();
    
    return NextResponse.json(
      { 
        ...newTemplate,
        message: "SOAP template created successfully" 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating SOAP template:", error);
    return NextResponse.json(
      { error: "Failed to create SOAP template" },
      { status: 500 }
    );
  }
}
