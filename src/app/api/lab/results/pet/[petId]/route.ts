import { NextRequest, NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { labResults, labOrders, labTestCatalog, pets } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const petIdString = resolvedParams.petId;
    if (!petIdString) {
      return NextResponse.json({ error: "Pet ID is required" }, { status: 400 });
    }

    const petId = parseInt(petIdString);
    if (isNaN(petId)) {
      return NextResponse.json({ error: "Invalid Pet ID" }, { status: 400 });
    }

        // First check if the pet exists
    const pet = await tenantDb.query.pets.findFirst({
      where: eq(pets.id, petId)
    });
    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // Fetch lab results for the pet by using the correct table structure
    // We need to query through labOrders since that's where petId is stored
    const labOrdersForPet = await tenantDb.query.labOrders.findMany({
      where: eq(labOrders.petId, petId),
      with: {
        results: {
          with: {
            test: true
          },
          orderBy: desc(labResults.resultDate)
        },
        pet: true
      }
    });

    // Flatten the results from all orders
    const results = labOrdersForPet.flatMap(order => 
      order.results.map(result => ({
        ...result,
        order: {
          ...order,
          results: undefined // Remove nested results to avoid circular reference
        }
      }))
    );

    // Transform the results to match the expected format
        const transformedResults = results.map((result: any) => {
      try {
        // Parse the results JSON if it's a string
        let parsedResults;
        if (typeof result.results === 'string') {
          parsedResults = JSON.parse(result.results);
        } else {
          parsedResults = result.results;
        }
        
        // If parsedResults is an array (multiple test results), flatten them
        if (Array.isArray(parsedResults)) {
          return parsedResults.map((testResult, index) => ({
            id: `${result.id}-${index}`, // Create unique ID for each test in the array
            resultDate: result.resultDate,
            testResult: testResult,
            interpretation: result.interpretation,
            status: typeof result.status === 'string' ? result.status : result.status[0],
            normalRange: result.normalRange,
            technician: result.technician,
            verifiedDate: result.verifiedDate,
            practitionerId: result.practitionerId,
            pdfUrl: result.pdfUrl,
            notes: typeof result.notes === 'string' ? result.notes : result.notes?.[0],
            filePath: typeof result.filePath === 'string' ? result.filePath : result.filePath?.[0],
            name: result.test?.testName || 'Test Result',
            category: 'Lab Result',
            type: 'lab_result',
            metadata: {
              orderId: result.labOrderId,
              testCatalogId: result.testCatalogId
            }
          }));
        } else {
          // Single test result
          return {
            id: result.id,
            resultDate: result.resultDate,
            testResult: parsedResults,
            interpretation: result.interpretation,
            status: typeof result.status === 'string' ? result.status : result.status[0],
            normalRange: result.normalRange,
            technician: result.technician,
            verifiedDate: result.verifiedDate,
            practitionerId: result.practitionerId,
            pdfUrl: result.pdfUrl,
            notes: typeof result.notes === 'string' ? result.notes : result.notes?.[0],
            filePath: typeof result.filePath === 'string' ? result.filePath : result.filePath?.[0],
            testName: result.test?.testName || 'Unknown Test',
            category: result.test?.category || 'lab_result',
            provider: result.order?.provider || 'unknown',
            orderDate: result.order?.orderDate,
            sampleType: result.order?.sampleType,
            soapLinks: result.order?.soapNoteId ? [{
              id: result.labOrderId,
              soapNoteId: result.order.soapNoteId,
              title: "SOAP Note Link"
            }] : []
          };
        }
      } catch (parseError) {
        console.error('Error parsing lab result:', parseError);
        return {
          id: result.id,
          resultDate: result.resultDate,
          testResult: result.results, // Return raw results if parsing fails
          interpretation: result.interpretation,
          status: typeof result.status === 'string' ? result.status : result.status[0],
          normalRange: result.normalRange,
          technician: result.technician,
          verifiedDate: result.verifiedDate,
          practitionerId: result.practitionerId,
          pdfUrl: result.pdfUrl,
          notes: typeof result.notes === 'string' ? result.notes : result.notes?.[0],
          filePath: typeof result.filePath === 'string' ? result.filePath : result.filePath?.[0],
          testName: result.test?.testName || 'Unknown Test',
          category: result.test?.category || 'lab_result',
          provider: result.order?.provider || 'unknown',
          orderDate: result.order?.orderDate,
          sampleType: result.order?.sampleType,
          error: 'Failed to parse results JSON'
        };
      }
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
