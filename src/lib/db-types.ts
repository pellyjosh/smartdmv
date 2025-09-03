// Client-safe mirror of a subset of DB types used in client components
export enum UserRoleEnum {
  CLIENT = 'CLIENT',
  PRACTICE_ADMINISTRATOR = 'PRACTICE_ADMINISTRATOR',
  ADMINISTRATOR = 'ADMINISTRATOR',
  VETERINARIAN = 'VETERINARIAN',
  TECHNICIAN = 'TECHNICIAN',
  RECEPTIONIST = 'RECEPTIONIST',
  PRACTICE_MANAGER = 'PRACTICE_MANAGER',
  PRACTICE_ADMIN = 'PRACTICE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  CASHIER = 'CASHIER',
  OFFICE_MANAGER = 'OFFICE_MANAGER',
}
export type UserRole = `${UserRoleEnum}`;
export const userRoleEnumValues = Object.values(UserRoleEnum) as string[];
