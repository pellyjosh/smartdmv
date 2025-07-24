// Marketplace schema exports for use in other parts of the application
export enum AddonCategory {
  CLIENT_PORTAL = "CLIENT_PORTAL",
  AI = "AI",
  ADMINISTRATIVE = "ADMINISTRATIVE",
  COMMUNICATION = "COMMUNICATION",
  FINANCIAL = "FINANCIAL",
}

export enum SubscriptionTier {
  BASIC = "BASIC",
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
}

export enum PaymentStatus {
  TRIAL = "TRIAL",
  PAID = "PAID",
  PAST_DUE = "PAST_DUE",
  CANCELLED = "CANCELLED",
}
