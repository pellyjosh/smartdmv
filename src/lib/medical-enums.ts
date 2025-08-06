// lib/medical-enums.ts
// Comprehensive enums for SmartDVM medical system

export enum MedicationRoute {
  ORAL = "oral",
  INJECTABLE = "injectable", 
  TOPICAL = "topical",
  OPHTHALMIC = "ophthalmic",
  OTIC = "otic",
  NASAL = "nasal",
  RECTAL = "rectal",
  INHALED = "inhaled",
  OTHER = "other"
}

export enum DosageFrequency {
  ONCE = "once",
  BID = "BID",        // Twice daily
  TID = "TID",        // Three times daily
  QID = "QID",        // Four times daily
  SID = "SID",        // Once daily
  PRN = "PRN",        // As needed
  EOD = "EOD",        // Every other day
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  OTHER = "other"
}

export enum TreatmentCategory {
  MEDICATION = "medication",
  PROCEDURE = "procedure",
  SURGERY = "surgery",
  THERAPY = "therapy",
  DIAGNOSTIC = "diagnostic",
  WELLNESS = "wellness",
  OTHER = "other"
}

export enum DEASchedule {
  NONE = "none",          // Not controlled
  CI = "schedule_i",      // Schedule I
  CII = "schedule_ii",    // Schedule II
  CIII = "schedule_iii",  // Schedule III
  CIV = "schedule_iv",    // Schedule IV
  CV = "schedule_v"       // Schedule V
}

export enum PrescriptionStatus {
  ACTIVE = "active",
  DISPENSED = "dispensed",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export enum TreatmentStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DISCONTINUED = "discontinued"
}

export enum InventoryType {
  MEDICATION = "medication",
  SUPPLY = "supply",
  EQUIPMENT = "equipment"
}

export enum TransactionType {
  ADD = "add",
  USE = "use",
  ADJUSTMENT = "adjustment",
  EXPIRED = "expired",
  LOST = "lost",
  DAMAGED = "damaged"
}

// Validation helpers
export const isValidMedicationRoute = (route: string): route is MedicationRoute => {
  return Object.values(MedicationRoute).includes(route as MedicationRoute);
};

export const isValidDosageFrequency = (frequency: string): frequency is DosageFrequency => {
  return Object.values(DosageFrequency).includes(frequency as DosageFrequency);
};

export const isValidTreatmentCategory = (category: string): category is TreatmentCategory => {
  return Object.values(TreatmentCategory).includes(category as TreatmentCategory);
};

// Display helpers
export const getMedicationRouteLabel = (route: MedicationRoute): string => {
  const labels: Record<MedicationRoute, string> = {
    [MedicationRoute.ORAL]: "Oral",
    [MedicationRoute.INJECTABLE]: "Injectable",
    [MedicationRoute.TOPICAL]: "Topical",
    [MedicationRoute.OPHTHALMIC]: "Ophthalmic (Eye)",
    [MedicationRoute.OTIC]: "Otic (Ear)",
    [MedicationRoute.NASAL]: "Nasal",
    [MedicationRoute.RECTAL]: "Rectal",
    [MedicationRoute.INHALED]: "Inhaled",
    [MedicationRoute.OTHER]: "Other"
  };
  return labels[route] || route;
};

export const getDosageFrequencyLabel = (frequency: DosageFrequency): string => {
  const labels: Record<DosageFrequency, string> = {
    [DosageFrequency.ONCE]: "Once",
    [DosageFrequency.BID]: "BID (Twice daily)",
    [DosageFrequency.TID]: "TID (Three times daily)",
    [DosageFrequency.QID]: "QID (Four times daily)",
    [DosageFrequency.SID]: "SID (Once daily)",
    [DosageFrequency.PRN]: "PRN (As needed)",
    [DosageFrequency.EOD]: "EOD (Every other day)",
    [DosageFrequency.WEEKLY]: "Weekly",
    [DosageFrequency.BIWEEKLY]: "Bi-weekly",
    [DosageFrequency.MONTHLY]: "Monthly",
    [DosageFrequency.OTHER]: "Other"
  };
  return labels[frequency] || frequency;
};
