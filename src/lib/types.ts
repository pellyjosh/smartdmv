export interface VetService {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  address: string;
  phone: string;
  website: string;
  openingHours: string; // Could be more structured, e.g., { day: string, hours: string }[]
  servicesOffered: string[];
  rating: number; // e.g., 0-5
}

export interface SymptomAssessmentResult {
  likelyIssues: string;
  severity: string;
  recommendation: string;
  additionalNotes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;

}

