import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { contacts, users, pets } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || (user.role !== "ADMINISTRATOR" && user.role !== "SUPER_ADMIN" && user.role !== "VETERINARIAN")) {
      return NextResponse.json({ error: 'Unauthorized. Administrator or veterinarian access required.' }, { status: 401 });
    }

    console.log('Fetching contact requests for practice:', user.practiceId);

    // Fetch contacts from the new contacts table
    const contactRequestsData = await tenantDb.query.contacts.findMany({
      where: eq(contacts.practiceId, parseInt(user.practiceId!)),
      with: {
        sender: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        veterinarian: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
            breed: true,
          }
        },
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(contacts.createdAt)],
    });

    // Transform contacts into the expected format
    const contactRequests = contactRequestsData.map((contact: any) => ({
      id: contact.id.toString(),
      title: contact.subject || 'Contact Request',
      message: contact.message || '',
      type: contact.contactMethod || 'message',
      priority: contact.urgency || 'medium',
      practiceId: contact.practiceId,
      userId: contact.senderId,
      relatedType: contact.petId ? 'pet' : 'general',
      relatedId: contact.petId?.toString() || null,
      link: contact.petId ? `/admin/pets/${contact.petId}` : null,
      read: contact.isRead || false,
      created_at: contact.createdAt,
      updated_at: contact.updatedAt,
      user: contact.sender ? {
        id: contact.sender.id.toString(),
        name: contact.sender.name || 'Unknown Client',
        email: contact.sender.email || '',
        role: contact.sender.role || 'CLIENT',
      } : undefined,
      client: contact.sender ? {
        id: contact.sender.id.toString(),
        name: contact.sender.name || 'Unknown Client',
        email: contact.sender.email || '',
      } : undefined,
      metadata: JSON.stringify({
        contactMethod: contact.contactMethod || 'message',
        urgency: contact.urgency || 'medium',
        clientName: contact.sender?.name || 'Unknown Client',
        petName: contact.pet?.name || null,
        petSpecies: contact.pet?.species || null,
        phoneNumber: contact.phoneNumber || null,
        preferredTime: contact.preferredTime || null,
        veterinarianRequested: contact.veterinarian?.name || null,
      })
    }));

    console.log(`Found ${contactRequests.length} contact requests`);

    return NextResponse.json(contactRequests, { status: 200 });
  } catch (error) {
    console.error('Error fetching contact requests:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contact requests due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
