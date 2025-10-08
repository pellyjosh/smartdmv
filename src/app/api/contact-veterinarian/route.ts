import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { notifications, appointments, users, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { z } from "zod";
import { randomUUID } from 'crypto';

// Validation schema for contact veterinarian requests
const contactVeterinarianSchema = z.object({
  petId: z.union([z.string(), z.number(), z.null()]).optional(),
  practitionerId: z.union([z.string(), z.number(), z.null()]).optional(),
  contactMethod: z.enum(["message", "video_call", "phone_call"]),
  urgency: z.enum(["low", "medium", "high", "emergency"]),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  phoneNumber: z.string().nullable().optional(),
  preferredTime: z.string().nullable().optional(),
});

type ContactVeterinarianRequest = {
  petId?: string | number | null;
  practitionerId?: string | number | null;
  contactMethod: "message" | "video_call" | "phone_call";
  urgency: "low" | "medium" | "high" | "emergency";
  subject: string;
  message: string;
  phoneNumber?: string | null;
  preferredTime?: string | null;
};

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request data
    const validationResult = contactVeterinarianSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const validatedData = validationResult.data as ContactVeterinarianRequest;
    const {
      contactMethod,
      urgency,
      subject,
      message,
      phoneNumber,
      preferredTime,
    } = validatedData;

    // Convert petId and practitionerId to strings if they exist
    const petId = validatedData.petId ? validatedData.petId.toString() : null;
    const practitionerId = validatedData.practitionerId ? validatedData.practitionerId.toString() : null;

    // Validate phone number for phone calls
    if (contactMethod === "phone_call" && !phoneNumber) {
      return NextResponse.json({ 
        error: 'Phone number is required for phone call requests' 
      }, { status: 400 });
    }

    // Validate practitioner selection for video calls
    if (contactMethod === "video_call" && !practitionerId) {
      return NextResponse.json({ 
        error: 'Specific veterinarian selection is required for video calls' 
      }, { status: 400 });
    }

    let responseData: any = {
      success: true,
      contactMethod,
      urgency,
    };

    // Handle different contact methods
    switch (contactMethod) {
      case "message":
        await handleMessageContact({
          tenantDb,
          userId: user.id,
          practiceId: user.practiceId!,
          practitionerId,
          petId,
          subject,
          message,
          urgency,
        });
        break;

      case "video_call":
        const videoCallData = await handleVideoCallRequest({
          tenantDb,
          userId: user.id,
          practiceId: user.practiceId!,
          practitionerId: practitionerId!,
          petId,
          subject,
          message,
          urgency,
        });
        responseData = { ...responseData, ...videoCallData };
        break;

      case "phone_call":
        await handlePhoneCallRequest({
          tenantDb,
          userId: user.id,
          practiceId: user.practiceId!,
          practitionerId,
          petId,
          subject,
          message,
          urgency,
          phoneNumber: phoneNumber!,
          preferredTime,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid contact method' }, { status: 400 });
    }

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to process contact request due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle message contact method
async function handleMessageContact({
  tenantDb,
  userId,
  practiceId,
  practitionerId,
  petId,
  subject,
  message,
  urgency,
}: {
  tenantDb: any;
  userId: string;
  practiceId: string;
  practitionerId?: string | null;
  petId?: string | null;
  subject: string;
  message: string;
  urgency: string;
}) {
  // Create contact record
  const contactData = {
    senderId: parseInt(userId),
    veterinarianId: practitionerId ? parseInt(practitionerId) : null,
    practiceId: parseInt(practiceId),
    petId: petId ? parseInt(petId) : null,
    contactMethod: 'message' as const,
    urgency: urgency as any,
    subject,
    message,
  };

  const [contact] = await tenantDb.insert(contacts).values(contactData).returning();
  console.log('Contact record created:', contact.id);

  // Create notification for the practice/specific practitioner
  const notificationData = {
    title: `New Message from Client: ${subject}`,
    message: `Urgency: ${urgency.toUpperCase()}\n\n${message}`,
    type: 'message',
    userId: practitionerId ? parseInt(practitionerId) : parseInt(userId), // Target user or fallback to client
    practiceId: parseInt(practiceId),
    relatedType: 'contact',
    relatedId: contact.id.toString(),
    link: `/admin/contact-requests`,
  };

  await tenantDb.insert(notifications).values(notificationData);
}

// Handle video call request
async function handleVideoCallRequest({
  tenantDb,
  userId,
  practiceId,
  practitionerId,
  petId,
  subject,
  message,
  urgency,
}: {
  tenantDb: any;
  userId: string;
  practiceId: string;
  practitionerId: string;
  petId?: string | null;
  subject: string;
  message: string;
  urgency: string;
}) {
  // Generate unique room ID for video call
  const roomId = `vet_call_${randomUUID()}`;

  // Create telemedicine appointment
  const appointmentData = {
    title: `Video Consultation: ${subject}`,
    description: `Urgency: ${urgency.toUpperCase()}\n\n${message}`,
    date: new Date(), // Immediate consultation request
    durationMinutes: '30', // Default 30 minutes for video consultations
    status: 'pending' as const,
    type: 'virtual',
    petId: petId ? parseInt(petId) : null,
    clientId: parseInt(userId),
    practitionerId: parseInt(practitionerId),
    practiceId: parseInt(practiceId),
    roomId,
    source: 'internal' as const,
  };

  const [appointment] = await tenantDb.insert(appointments).values(appointmentData).returning();

  // Create contact record
  const contactData = {
    senderId: parseInt(userId),
    veterinarianId: parseInt(practitionerId),
    practiceId: parseInt(practiceId),
    petId: petId ? parseInt(petId) : null,
    contactMethod: 'video_call' as const,
    urgency: urgency as any,
    subject,
    message,
    appointmentId: parseInt(appointment.id.toString()),
    roomId,
  };

  const [contact] = await tenantDb.insert(contacts).values(contactData).returning();
  console.log('Contact record created:', contact.id);

  // Create notification for the practitioner
  const notificationData = {
    title: `Urgent Video Call Request: ${subject}`,
    message: `Client requesting immediate video consultation.\n\nUrgency: ${urgency.toUpperCase()}\n\n${message}`,
    type: 'appointment',
    userId: parseInt(practitionerId),
    practiceId: parseInt(practiceId),
    relatedType: 'contact',
    relatedId: contact.id.toString(),
    link: `/admin/contact-requests`,
  };

  await tenantDb.insert(notifications).values(notificationData);

  return {
    appointmentId: appointment.id,
    roomId,
  };
}

// Handle phone call request
async function handlePhoneCallRequest({
  tenantDb,
  userId,
  practiceId,
  practitionerId,
  petId,
  subject,
  message,
  urgency,
  phoneNumber,
  preferredTime,
}: {
  tenantDb: any;
  userId: string;
  practiceId: string;
  practitionerId?: string | null;
  petId?: string | null;
  subject: string;
  message: string;
  urgency: string;
  phoneNumber: string;
  preferredTime?: string | null;
}) {
  // Get a practitioner to notify if none specified
  let targetUserId = practitionerId ? parseInt(practitionerId) : null;
  
  if (!targetUserId) {
    // Find any veterinarian in the practice to notify
    const practitioner = await tenantDb.query.users.findFirst({
      where: and(
        eq(users.practiceId, parseInt(practiceId)),
        eq(users.role, 'VETERINARIAN')
      ),
    });
    
    if (practitioner) {
      targetUserId = parseInt(practitioner.id.toString());
    } else {
      targetUserId = parseInt(userId); // Fallback to client
    }
  }

  // Create contact record
  const contactData = {
    senderId: parseInt(userId),
    veterinarianId: practitionerId ? parseInt(practitionerId) : targetUserId,
    practiceId: parseInt(practiceId),
    petId: petId ? parseInt(petId) : null,
    contactMethod: 'phone_call' as const,
    urgency: urgency as any,
    subject,
    message,
    phoneNumber,
    preferredTime,
  };

  const [contact] = await tenantDb.insert(contacts).values(contactData).returning();

  // Create notification for phone call request
  const notificationData = {
    title: `Phone Call Request: ${subject}`,
    message: `Client requests phone call back.\n\nPhone: ${phoneNumber}\n${preferredTime ? `Preferred Time: ${preferredTime}\n` : ''}Urgency: ${urgency.toUpperCase()}\n\n${message}`,
    type: 'message',
    userId: targetUserId,
    practiceId: parseInt(practiceId),
    relatedType: 'contact',
    relatedId: contact.id.toString(),
    link: `/admin/contact-requests`,
  };

  await tenantDb.insert(notifications).values(notificationData);
}
