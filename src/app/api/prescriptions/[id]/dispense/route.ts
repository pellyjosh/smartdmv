// src/app/api/prescriptions/[id]/dispense/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { prescriptions } from "@/db/schemas/prescriptionsSchema";
import { inventory } from "@/db/schemas/inventorySchema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Utility function for database-agnostic timestamp handling
// Always return a Date object to satisfy DB column types (Drizzle expects Date)
const getTimestamp = (): Date => new Date();

// Schema for dispense request
const dispenseSchema = z.object({
  quantity: z.string().transform((val) => parseInt(val, 10)).refine((val) => val > 0, {
    message: "Quantity must be a positive number"
  }),
});

// POST /api/prescriptions/[id]/dispense - Dispense medication
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const prescriptionId = parseInt(resolvedParams.id);
    
    if (isNaN(prescriptionId)) {
      return NextResponse.json(
        { error: "Invalid prescription ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    // Validate dispense data
    const validationResult = dispenseSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { quantity } = validationResult.data;

    // Get the prescription
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId)
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    if (prescription.status !== "active") {
      return NextResponse.json(
        { error: "Cannot dispense inactive prescription" },
        { status: 400 }
      );
    }

  // Check if there's enough remaining to dispense
  const currentDispensed = Number(prescription.quantityDispensed) || 0;
  const remainingToDispense = Number(prescription.quantityPrescribed) - currentDispensed;
    
    if (quantity > remainingToDispense) {
      return NextResponse.json(
        { error: `Cannot dispense ${quantity}. Only ${remainingToDispense} remaining to dispense.` },
        { status: 400 }
      );
    }

    // If prescription has an inventory item, check and update inventory
    if (prescription.inventoryItemId) {
      const inventoryItem = await db.query.inventory.findFirst({
        where: eq(inventory.id, prescription.inventoryItemId)
      });

      if (inventoryItem) {
        if (inventoryItem.quantity < quantity) {
          return NextResponse.json(
            { error: `Insufficient inventory. Only ${inventoryItem.quantity} available.` },
            { status: 400 }
          );
        }

        // Update inventory - reduce quantity
        // @ts-ignore
        await db.update(inventory)
          .set({ 
            quantity: inventoryItem.quantity - quantity,
            updatedAt: getTimestamp()
          })
          .where(eq(inventory.id, prescription.inventoryItemId));
      }
    }

    // Update prescription - increase dispensed quantity
    const newQuantityDispensed = currentDispensed + quantity;
  const isCompleted = newQuantityDispensed >= Number(prescription.quantityPrescribed);

    // @ts-ignore
    const [updatedPrescription] = await db.update(prescriptions)
      .set({ 
  quantityDispensed: String(newQuantityDispensed),
  dateDispensed: getTimestamp(),
        status: isCompleted ? "completed" : prescription.status,
        updatedAt: getTimestamp()
      })
      .where(eq(prescriptions.id, prescriptionId))
      .returning();

    return NextResponse.json(
      { 
        ...updatedPrescription,
        message: `Successfully dispensed ${quantity} ${prescription.medicationName}` 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Error dispensing medication:", error);
    return NextResponse.json(
      { error: "Failed to dispense medication" },
      { status: 500 }
    );
  }
}
