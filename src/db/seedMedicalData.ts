import { config } from 'dotenv';
config();

import { db } from './index';
import { soapNotes, vaccinations, vaccineTypes, users, pets } from './schema';
import { eq } from 'drizzle-orm';

async function seedMedicalData() {
  console.log('🏥 Starting medical data seeding...');

  try {
    // Get existing pets and users
    const existingPets = await db.query.pets.findMany({
      with: {
        owner: true
      }
    });

    const veterinarians = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, 'VETERINARIAN')
    });

    if (existingPets.length === 0 || veterinarians.length === 0) {
      console.log('❌ No pets or veterinarians found. Please run the main seed script first.');
      return;
    }

    const [buddy, whiskers, charlie] = existingPets.slice(0, 3);
    const [vet1] = veterinarians;

    console.log(`Found ${existingPets.length} pets and ${veterinarians.length} veterinarians`);

    // Create vaccine types first
    console.log('💉 Seeding vaccine types...');
    const vaccineTypesData = [
      {
        practiceId: buddy.practiceId,
        name: 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
        type: 'core' as const,
        species: 'dog' as const,
        manufacturer: 'Zoetis',
        diseasesProtected: JSON.stringify(['Distemper', 'Hepatitis', 'Parvovirus', 'Parainfluenza']),
        recommendedSchedule: JSON.stringify({ puppyBooster: '6-8 weeks, 10-12 weeks, 14-16 weeks', adult: 'Annual' }),
        durationOfImmunity: '1 year',
        sideEffects: 'Mild lethargy, soreness at injection site',
        contraindications: 'Pregnant animals, immunocompromised animals',
      },
      {
        practiceId: buddy.practiceId,
        name: 'Rabies',
        type: 'core' as const,
        species: 'dog' as const,
        manufacturer: 'Merial',
        diseasesProtected: JSON.stringify(['Rabies']),
        recommendedSchedule: JSON.stringify({ puppy: '12-16 weeks', adult: 'Every 3 years after initial booster' }),
        durationOfImmunity: '3 years',
        sideEffects: 'Mild lethargy, soreness at injection site',
        contraindications: 'Pregnant animals, sick animals',
      },
      {
        practiceId: whiskers.practiceId,
        name: 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
        type: 'core' as const,
        species: 'cat' as const,
        manufacturer: 'Zoetis',
        diseasesProtected: JSON.stringify(['Rhinotracheitis', 'Calicivirus', 'Panleukopenia']),
        recommendedSchedule: JSON.stringify({ kitten: '6-8 weeks, 10-12 weeks, 14-16 weeks', adult: 'Annual' }),
        durationOfImmunity: '1 year',
        sideEffects: 'Mild lethargy, decreased appetite',
        contraindications: 'Pregnant animals, immunocompromised animals',
      }
    ];

    const insertedVaccineTypes = await db.insert(vaccineTypes).values(vaccineTypesData).returning();
    console.log(`✅ Inserted ${insertedVaccineTypes.length} vaccine types`);

    // Create vaccination records
    console.log('💉 Seeding vaccinations...');
    const vaccinationsData = [
      {
        petId: buddy.id,
        practiceId: buddy.practiceId,
        vaccineTypeId: insertedVaccineTypes.find(v => v.name.includes('DHPP'))?.id,
        vaccineName: 'DHPP',
        manufacturer: 'Zoetis',
        lotNumber: 'LOT123456',
        serialNumber: 'SER789012',
        expirationDate: new Date('2026-12-31'),
        administrationDate: new Date('2024-06-15'),
        administrationSite: 'Left shoulder',
        route: 'subcutaneous' as const,
        dose: '1ml',
        administeringVetId: vet1.id,
        nextDueDate: new Date('2025-06-15'),
        status: 'completed' as const,
        reactions: null,
        notes: 'No adverse reactions observed. Pet tolerated vaccine well.',
      },
      {
        petId: buddy.id,
        practiceId: buddy.practiceId,
        vaccineTypeId: insertedVaccineTypes.find(v => v.name.includes('Rabies'))?.id,
        vaccineName: 'Rabies',
        manufacturer: 'Merial',
        lotNumber: 'RAB654321',
        serialNumber: 'RABSER456',
        expirationDate: new Date('2027-08-31'),
        administrationDate: new Date('2024-06-15'),
        administrationSite: 'Right shoulder',
        route: 'subcutaneous' as const,
        dose: '1ml',
        administeringVetId: vet1.id,
        nextDueDate: new Date('2027-06-15'),
        status: 'completed' as const,
        reactions: null,
        notes: 'Standard rabies vaccination. Updated rabies tag provided.',
      },
      {
        petId: whiskers.id,
        practiceId: whiskers.practiceId,
        vaccineTypeId: insertedVaccineTypes.find(v => v.name.includes('FVRCP'))?.id,
        vaccineName: 'FVRCP',
        manufacturer: 'Zoetis',
        lotNumber: 'CAT789012',
        serialNumber: 'CATSER123',
        expirationDate: new Date('2026-10-31'),
        administrationDate: new Date('2024-05-20'),
        administrationSite: 'Left shoulder',
        route: 'subcutaneous' as const,
        dose: '1ml',
        administeringVetId: vet1.id,
        nextDueDate: new Date('2025-05-20'),
        status: 'completed' as const,
        reactions: null,
        notes: 'Annual FVRCP booster. Cat showed no stress during procedure.',
      },
      // Add some upcoming/overdue vaccinations
      {
        petId: charlie.id,
        practiceId: charlie.practiceId,
        vaccineTypeId: insertedVaccineTypes.find(v => v.name.includes('DHPP'))?.id,
        vaccineName: 'DHPP',
        manufacturer: 'Zoetis',
        lotNumber: null,
        serialNumber: null,
        expirationDate: null,
        administrationDate: new Date('2025-10-01'), // Future date
        administrationSite: null,
        route: null,
        dose: null,
        administeringVetId: null,
        nextDueDate: new Date('2025-10-01'),
        status: 'scheduled' as const,
        reactions: null,
        notes: 'Scheduled for annual DHPP booster.',
      }
    ];

    const insertedVaccinations = await db.insert(vaccinations).values(vaccinationsData).returning();
    console.log(`✅ Inserted ${insertedVaccinations.length} vaccination records`);

    // Create SOAP notes (medical records)
    console.log('📋 Seeding SOAP notes...');
    const soapNotesData = [
      {
        appointmentId: null,
        practitionerId: vet1.id,
        petId: buddy.id,
        subjective: 'Owner reports that Buddy has been eating well and is very active. No concerns about behavior or appetite. Regular exercise with daily walks.',
        objective: 'PE: BAR, alert and responsive. Weight: 30kg (stable). Temperature: 38.5°C, HR: 120 bpm, RR: 24 bpm. Body condition score: 4/9. Dental exam reveals mild tartar buildup on premolars. Heart and lung sounds normal. Abdominal palpation unremarkable.',
        assessment: 'Annual wellness examination - overall excellent health. Mild dental tartar noted but not requiring immediate intervention.',
        plan: 'Continue current diet and exercise routine. Recommend dental cleaning within 6 months. Administered annual DHPP and Rabies vaccinations. Return in 1 year for annual examination.',
        locked: false,
      },
      {
        appointmentId: null,
        practitionerId: vet1.id,
        petId: whiskers.id,
        subjective: 'Owner reports Whiskers has been hiding more than usual and eating less over the past week. Indoor cat, no recent changes to environment.',
        objective: 'PE: Quiet but alert. Weight: 3.8kg (down from 4kg last visit). Temperature: 39.1°C, HR: 180 bpm, RR: 32 bpm. Mild dehydration noted. Dental exam shows healthy gums and teeth. Palpable mass in cranial abdomen.',
        assessment: 'Weight loss and behavioral changes with palpable abdominal mass. Differential diagnoses include gastrointestinal foreign body, neoplasia, or inflammatory bowel disease.',
        plan: 'Recommend abdominal ultrasound and complete blood work including chemistry panel and CBC. Start appetite stimulant (mirtazapine 1.88mg SID). Recheck in 3-5 days or sooner if condition worsens. Owner advised to monitor food and water intake closely.',
        locked: false,
      },
      {
        appointmentId: null,
        practitionerId: vet1.id,
        petId: charlie.id,
        subjective: 'Post-surgical recheck for mass removal from left hind leg performed 2 weeks ago. Owner reports Charlie is doing well, incision site looks good, and activity level is returning to normal.',
        objective: 'PE: Bright and alert. Weight: 25kg (stable). Surgical site: well-healed, no signs of infection, sutures removed. Full range of motion in left hind leg. Gait normal. Temperature: 38.3°C, HR: 110 bpm, RR: 20 bpm.',
        assessment: 'Post-operative recheck - excellent healing. Histopathology results: benign lipoma. No evidence of complications.',
        plan: 'Surgery site has healed excellently. No restrictions on activity. Continue to monitor for any recurrence. Routine annual examination in 6 months. No medications needed at this time.',
        locked: false,
      }
    ];

    const insertedSOAPNotes = await db.insert(soapNotes).values(soapNotesData).returning();
    console.log(`✅ Inserted ${insertedSOAPNotes.length} SOAP notes`);

    console.log('\n🎉 Medical data seeding completed successfully!');
    console.log(`Summary:`);
    console.log(`- ${insertedVaccineTypes.length} vaccine types`);
    console.log(`- ${insertedVaccinations.length} vaccination records`);
    console.log(`- ${insertedSOAPNotes.length} medical records (SOAP notes)`);

  } catch (error) {
    console.error('❌ Error seeding medical data:', error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedMedicalData()
    .then(() => {
      console.log('✅ Medical data seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Medical data seeding failed:', error);
      process.exit(1);
    });
}

export { seedMedicalData };
