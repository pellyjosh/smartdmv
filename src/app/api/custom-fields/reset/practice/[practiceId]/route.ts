import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldCategories, customFieldGroups, customFieldValues } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: { practiceId: string } }
) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const rawPracticeId = params.practiceId;
    const practiceId = typeof rawPracticeId === 'string' ? parseInt(rawPracticeId, 10) : rawPracticeId;
    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    await tenantDb.delete(customFieldValues).where(eq(customFieldValues.practiceId, practiceId));
    await tenantDb.delete(customFieldGroups).where(eq(customFieldGroups.practiceId, practiceId));
    await tenantDb.delete(customFieldCategories).where(eq(customFieldCategories.practiceId, practiceId));

    const categoriesSpec = [
      { name: 'Appointments', description: 'Default appointment dropdowns' },
      { name: 'Pet Information', description: 'Default pet information dropdowns' },
    ];

    const insertedCategories: Record<string, number> = {};
    for (const c of categoriesSpec) {
      const res = await tenantDb.insert(customFieldCategories).values({ practiceId, name: c.name, description: c.description }).returning();
      insertedCategories[c.name] = res[0].id;
    }

    const groupsSpec = [
      { category: 'Appointments', name: 'Types', key: 'types' },
      { category: 'Appointments', name: 'Appointment Types', key: 'appointment_types' },
      { category: 'Pet Information', name: 'Color', key: 'color' },
      { category: 'Pet Information', name: 'Pet Type', key: 'pet_type' },
      { category: 'Pet Information', name: 'Species', key: 'species' },
      { category: 'Pet Information', name: 'Feline Breed', key: 'feline_breed' },
      { category: 'Pet Information', name: 'Canine Breed', key: 'canine_breed' },
    ];

    const insertedGroups: Record<string, number> = {};
    for (const g of groupsSpec) {
      const res = await tenantDb.insert(customFieldGroups).values({
        practiceId,
        categoryId: insertedCategories[g.category],
        name: g.name,
        key: g.key,
      }).returning();
      insertedGroups[g.key] = res[0].id;
    }

    const valuesSpec = [
      { groupKey: 'types', label: 'Virtual Consultation', value: 'virtual' },
      { groupKey: 'types', label: 'In-Person Appointment', value: 'in-person' },
      { groupKey: 'types', label: 'Surgery', value: 'surgery' },
      { groupKey: 'types', label: 'Dental Procedure', value: 'dental' },
      { groupKey: 'types', label: 'Vaccination', value: 'vaccination' },
      { groupKey: 'types', label: 'Checkup', value: 'checkup' },
      { groupKey: 'types', label: 'Wellness Exam', value: 'wellness' },
      { groupKey: 'types', label: 'Emergency', value: 'emergency' },

      { groupKey: 'appointment_types', label: 'Virtual Consultation', value: 'virtual' },
      { groupKey: 'appointment_types', label: 'In-Person Appointment', value: 'in-person' },
      { groupKey: 'appointment_types', label: 'Surgery', value: 'surgery' },
      { groupKey: 'appointment_types', label: 'Dental Procedure', value: 'dental' },
      { groupKey: 'appointment_types', label: 'Vaccination', value: 'vaccination' },
      { groupKey: 'appointment_types', label: 'Checkup', value: 'checkup' },
      { groupKey: 'appointment_types', label: 'Wellness Exam', value: 'wellness' },
      { groupKey: 'appointment_types', label: 'Emergency', value: 'emergency' },

      { groupKey: 'color', label: 'White', value: 'white' },
      { groupKey: 'color', label: 'Brown', value: 'brown' },

      { groupKey: 'pet_type', label: 'Dog - Small Breed', value: 'dog_small' },
      { groupKey: 'pet_type', label: 'Dog - Medium Breed', value: 'dog_medium' },
      { groupKey: 'pet_type', label: 'Dog - Large Breed', value: 'dog_large' },
      { groupKey: 'pet_type', label: 'Cat - Domestic', value: 'cat_domestic' },
      { groupKey: 'pet_type', label: 'Cat - Exotic', value: 'cat_exotic' },
      { groupKey: 'pet_type', label: 'Bird - Small', value: 'bird_small' },
      { groupKey: 'pet_type', label: 'Bird - Large', value: 'bird_large' },
      { groupKey: 'pet_type', label: 'Reptile', value: 'reptile' },
      { groupKey: 'pet_type', label: 'Small Mammal', value: 'small_mammal' },
      { groupKey: 'pet_type', label: 'Exotic', value: 'exotic' },

      { groupKey: 'species', label: 'Canine', value: 'canine' },
      { groupKey: 'species', label: 'Feline', value: 'feline' },

      { groupKey: 'feline_breed', label: 'Abyssinian', value: 'abyssinian' },
      { groupKey: 'feline_breed', label: 'Maine Coon', value: 'maine_coon' },
      { groupKey: 'feline_breed', label: 'Bengal', value: 'bengal' },

      { groupKey: 'canine_breed', label: 'German Shepherd', value: 'german_shepherd' },
      { groupKey: 'canine_breed', label: 'Bulldog', value: 'bulldog' },
      { groupKey: 'canine_breed', label: 'Labrador Retriever', value: 'labrador_retriever' },
      { groupKey: 'canine_breed', label: 'Golden Retriever', value: 'golden_retriever' },
    ];

    for (const v of valuesSpec) {
      const groupId = insertedGroups[v.groupKey];
      if (!groupId) continue;
      await tenantDb.insert(customFieldValues).values({
        practiceId,
        groupId,
        value: v.value,
        label: v.label,
        isActive: true,
      });
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error resetting custom fields:', error);
    return NextResponse.json({ error: 'Failed to reset custom fields' }, { status: 500 });
  }
}