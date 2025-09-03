// Real data interfaces for veterinary services
import { db } from '@/db';
import { appointments, treatmentTemplates, treatments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface VetService {
  id: string;
  name: string;
  description: string;
  price?: number;
  category: string;
  duration: number;
  type: 'appointment' | 'treatment_template';
}

// Fetch real services from appointments and treatment templates
export async function getVetServices(): Promise<VetService[]> {
  try {
    // Get unique appointment types as services
    const appointmentTypes = await db
      .selectDistinct({
        id: appointments.id,
        title: appointments.title,
        description: appointments.description,
        durationMinutes: appointments.durationMinutes,
        type: appointments.type
      })
      .from(appointments)
      .where(eq(appointments.status, 'approved'));

    // Get treatment templates as services
    const treatmentTemplateServices = await db
      .select({
        id: treatmentTemplates.id,
        name: treatmentTemplates.name,
        description: treatmentTemplates.description,
        category: treatmentTemplates.category
      })
      .from(treatmentTemplates)
      .where(eq(treatmentTemplates.isActive, true));

    // Convert appointments to services
    const appointmentServices: VetService[] = appointmentTypes.map(apt => ({
      id: `apt_${apt.id}`,
      name: Array.isArray(apt.title) ? apt.title[0] : (apt.title || 'Veterinary Service'),
      description: Array.isArray(apt.description) ? apt.description[0] : (apt.description || 'Professional veterinary care'),
      category: Array.isArray(apt.type) ? apt.type[0] : (apt.type || 'General'),
      duration: parseInt(Array.isArray(apt.durationMinutes) ? apt.durationMinutes[0] : (apt.durationMinutes || '30')),
      type: 'appointment' as const
    }));

    // Convert treatment templates to services  
    const templateServices: VetService[] = treatmentTemplateServices.map(template => ({
      id: `tpl_${template.id}`,
      name: Array.isArray(template.name) ? template.name[0] : template.name,
      description: Array.isArray(template.description) ? template.description[0] : (template.description || 'Professional treatment'),
      category: Array.isArray(template.category) ? template.category[0] : (template.category || 'Treatment'),
      duration: 30, // Default duration for treatments
      type: 'treatment_template' as const
    }));

    return [...appointmentServices, ...templateServices];
  } catch (error) {
    console.error('Error fetching vet services:', error);
    // Fallback to static data if database fails
    return [
      {
        id: '1',
        name: 'General Checkup',
        description: 'Comprehensive health examination',
        price: 50,
        category: 'General',
        duration: 30,
        type: 'appointment'
      },
      {
        id: '2',
        name: 'Vaccination',
        description: 'Standard vaccination package',
        price: 35,
        category: 'Preventive',
        duration: 15,
        type: 'appointment'
      },
      {
        id: '3',
        name: 'Dental Cleaning',
        description: 'Professional dental cleaning',
        price: 120,
        category: 'Dental',
        duration: 60,
        type: 'treatment_template'
      }
    ];
  }
}

export async function getServiceById(id: string): Promise<VetService | undefined> {
  const services = await getVetServices();
  return services.find(service => service.id === id);
}

// Legacy sync function for backward compatibility (deprecated)
export const mockVetServices: VetService[] = [
  {
    id: '1',
    name: 'General Checkup',
    description: 'Comprehensive health examination',
    price: 50,
    category: 'General',
    duration: 30,
    type: 'appointment'
  },
  {
    id: '2',
    name: 'Vaccination',
    description: 'Standard vaccination package',
    price: 35,
    category: 'Preventive',
    duration: 15,
    type: 'appointment'
  },
  {
    id: '3',
    name: 'Dental Cleaning',
    description: 'Professional dental cleaning',
    price: 120,
    category: 'Dental',
    duration: 60,
    type: 'treatment_template'
  }
];
