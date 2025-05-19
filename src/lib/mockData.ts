import type { VetService } from './types';

export const mockVetServices: VetService[] = [
  {
    id: '1',
    name: 'Paws & Claws Clinic',
    shortDescription: 'Comprehensive care for your beloved pets.',
    fullDescription: 'Paws & Claws Clinic offers a wide range of veterinary services, from routine check-ups and vaccinations to advanced surgical procedures. Our compassionate team is dedicated to providing the highest quality care for your furry, scaled, or feathered friends.',
    imageUrl: 'https://placehold.co/600x400.png',
    address: '123 Pet Lane, Pawtown, CA 90210',
    phone: '555-1234',
    website: 'https://example.com/pawsandclaws',
    openingHours: 'Mon-Fri: 8am - 6pm, Sat: 9am - 1pm',
    servicesOffered: ['Vaccinations', 'Wellness Exams', 'Surgery', 'Dental Care', 'Emergency Services'],
    rating: 4.5,
  },
  {
    id: '2',
    name: 'Happy Tails Hospital',
    shortDescription: 'Your pet\'s health and happiness is our priority.',
    fullDescription: 'At Happy Tails Hospital, we believe that a healthy pet is a happy pet. We provide state-of-the-art medical care in a friendly and welcoming environment. Our services include diagnostics, internal medicine, and behavioral counseling.',
    imageUrl: 'https://placehold.co/600x400.png',
    address: '456 Woof Street, Tailville, TX 75001',
    phone: '555-5678',
    website: 'https://example.com/happytails',
    openingHours: 'Mon-Sat: 9am - 7pm',
    servicesOffered: ['Diagnostics', 'Internal Medicine', 'Behavioral Counseling', 'Nutrition Advice'],
    rating: 4.8,
  },
  {
    id: '3',
    name: 'The Vet Connect',
    shortDescription: 'Connecting pets with expert veterinary care.',
    fullDescription: 'The Vet Connect is a modern veterinary practice focused on preventative care and owner education. We strive to build lasting relationships with our clients and their pets, offering personalized treatment plans.',
    imageUrl: 'https://placehold.co/600x400.png',
    address: '789 Bark Avenue, Meowburg, FL 33001',
    phone: '555-9012',
    website: 'https://example.com/thevetconnect',
    openingHours: 'Mon-Fri: 9am - 5pm, By appointment',
    servicesOffered: ['Preventative Care', 'Microchipping', 'Senior Pet Care', 'Pharmacy'],
    rating: 4.2,
  },
  {
    id: '4',
    name: 'Critter Care Center',
    shortDescription: 'Specialized care for exotic pets and small animals.',
    fullDescription: 'Critter Care Center provides expert veterinary services for a wide range of animals, including birds, reptiles, and small mammals. Our experienced vets understand the unique needs of exotic pets.',
    imageUrl: 'https://placehold.co/600x400.png',
    address: '101 Feather Way, Critter City, NY 10001',
    phone: '555-3456',
    website: 'https://example.com/crittercare',
    openingHours: 'Tue-Sat: 10am - 6pm',
    servicesOffered: ['Exotic Pet Care', 'Avian Medicine', 'Reptile Health', 'Small Mammal Surgery'],
    rating: 4.9,
  },
];

export const getServiceById = (id: string): VetService | undefined => {
  return mockVetServices.find(service => service.id === id);
};
