import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { pets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId');
  const practiceId = url.searchParams.get('practiceId');

  console.log('Request URL:', request.url);
  console.log('Extracted Client ID:', clientId);
  console.log('Extracted Practice ID:', practiceId);

  try {
    if (clientId) {
      const petsData = await db.query.pets.findMany({
        where: (pets, { eq }) => eq(pets.ownerId, clientId),
        with: {
          owner: true
        }
      });
      if (petsData.length === 0) {
        console.log('No pets found for Client ID:', clientId);
        return NextResponse.json({ error: 'No pets found for this client. Please ensure the client ID is correct and data exists in the database.' }, { status: 404 });
      }
      return NextResponse.json(petsData, { status: 200 });
    } else if (practiceId) {
      const petsData = await db.query.pets.findMany({
        where: (pets, { eq }) => eq(pets.practiceId, practiceId),
        with: {
          owner: true
        }
      });
      if (petsData.length === 0) {
        console.log('No pets found for Practice ID:', practiceId);
        return NextResponse.json({ error: 'No pets found for this practice. Please ensure the practice ID is correct and data exists in the database.' }, { status: 404 });
      }
      return NextResponse.json(petsData, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid parameters. Please provide a valid client ID or practice ID as a query parameter.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets due to a server error. Please try again later.' }, { status: 500 });
  }
}
