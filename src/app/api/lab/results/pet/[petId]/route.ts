import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/tenant-db.config";
import { labResults, labOrders, labTestCatalog } from "@/db/schemas/labSchema";
import { pets } from "@/db/schemas/petsSchema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { petId: string } }
) {
  try {
    const petId = params.petId;
    if (!petId) {
      return NextResponse.json({ error: "Pet ID is required" }, { status: 400 });
    }

    const db = await getDb();

    // First check if the pet exists
    const pet = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
    if (pet.length === 0) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // Fetch lab results for the pet by joining with lab orders
    const results = await db
      .select({
        id: labResults.id,
        resultDate: labResults.resultDate,
        results: labResults.results,
        interpretation: labResults.interpretation,
        status: labResults.status,
        referenceRange: labResults.referenceRange,
        previousValue: labResults.previousValue,
        previousDate: labResults.previousDate,
        trendDirection: labResults.trendDirection,
        abnormalFlags: labResults.abnormalFlags,
        reviewedBy: labResults.reviewedBy,
        reviewedAt: labResults.reviewedAt,
        notes: labResults.notes,
        filePath: labResults.filePath,
        createdAt: labResults.createdAt,
        // From lab orders
        orderId: labOrders.id,
        petId: labOrders.petId,
        soapNoteId: labOrders.soapNoteId,
        // From test catalog
        testName: labTestCatalog.testName,
        testCode: labTestCatalog.testCode,
        category: labTestCatalog.category,
        description: labTestCatalog.description
      })
      .from(labResults)
      .leftJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
      .leftJoin(labTestCatalog, eq(labResults.testCatalogId, labTestCatalog.id))
      .where(eq(labOrders.petId, petId))
      .orderBy(desc(labResults.resultDate));

    // Transform the results to match the expected format
    const transformedResults = results.map(result => {
      let parameters = [];
      
      // Parse the results JSON if it exists
      try {
        if (result.results) {
          const parsedResults = JSON.parse(result.results);
          // Convert the parsed results to the expected parameter format
          if (Array.isArray(parsedResults)) {
            parameters = parsedResults;
          } else if (typeof parsedResults === 'object') {
            // If it's an object, convert each key-value pair to a parameter
            parameters = Object.entries(parsedResults).map(([name, value]: [string, any]) => ({
              name,
              value: value?.toString() || '',
              units: value?.units || '',
              status: result.status || 'pending',
              referenceRange: result.referenceRange || '',
              previousValue: result.previousValue || '',
              trend: result.trendDirection === 'increasing' ? 'up' : 
                     result.trendDirection === 'decreasing' ? 'down' : 'stable'
            }));
          }
        }
      } catch (e) {
        console.warn('Error parsing lab results JSON:', e);
        // Fallback: create a single parameter with the raw result
        parameters = [{
          name: result.testName || 'Test Result',
          value: result.results || '',
          units: '',
          status: result.status || 'pending',
          referenceRange: result.referenceRange || '',
          previousValue: result.previousValue || '',
          trend: result.trendDirection === 'increasing' ? 'up' : 
                 result.trendDirection === 'decreasing' ? 'down' : 'stable'
        }];
      }

      return {
        id: result.id,
        testName: result.testName || 'Unknown Test',
        status: result.status || 'pending',
        resultDate: result.resultDate?.toISOString() || new Date().toISOString(),
        parameters,
        notes: result.notes,
        soapLinks: result.soapNoteId ? [{
          id: result.orderId,
          soapNoteId: result.soapNoteId,
          displaySection: 'objective' as const,
          highlighted: false,
          notes: result.interpretation
        }] : []
      };
    });

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error("Error fetching lab results for pet:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab results" },
      { status: 500 }
    );
  }
}
