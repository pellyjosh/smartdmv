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

