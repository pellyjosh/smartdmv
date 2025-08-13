// src/app/api/lab-results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { labResults } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get("petId");

    let results;

    if (petId) {
      // Find lab results for a specific pet by joining with lab orders
      results = await db.query.labResults.findMany({
        with: {
          order: {
            with: {
              pet: true,
              practice: true
            }
          },
          test: true,
          reviewedByUser: true
        },
        orderBy: (labResults, { desc }) => [desc(labResults.resultDate)]
      });
      
      // Filter by pet ID from the lab order
      results = results.filter(result => result.order?.petId === parseInt(petId));
    } else {
      results = await db.query.labResults.findMany({
        with: {
          order: {
            with: {
              pet: true,
              practice: true
            }
          },
          test: true,
          reviewedByUser: true
        },
        orderBy: (labResults, { desc }) => [desc(labResults.resultDate)]
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching lab results:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab results" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For a simple lab result entry
    const newLabResult = await db.insert(labResults).values({
      labOrderId: body.labOrderId,
      testCatalogId: body.testCatalogId,
      resultDate: new Date(body.resultDate || new Date()),
      results: body.results,
      interpretation: body.interpretation,
      status: body.status || "pending",
      referenceRange: body.referenceRange,
      notes: body.notes
    }).returning().then(rows => rows[0]);

    return NextResponse.json(newLabResult);
  } catch (error) {
    console.error("Error creating lab result:", error);
    return NextResponse.json(
      { error: "Failed to create lab result" },
      { status: 500 }
    );
  }
}
