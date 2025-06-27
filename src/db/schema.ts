import { users, administratorAccessiblePractices, UserRoleEnum } from './schemas/usersSchema';
import { practices } from './schemas/practicesSchema';
import { sessions } from './schemas/sessionsSchema';
import { appointments } from './schemas/appointmentsSchema';
import { pets } from './schemas/petsSchema';
// Import the new custom field schemas
import {
  customFieldCategories,
  customFieldGroups,
  customFieldValues,
} from './schemas/customFieldsSchema';


export const schema = {
  users,
  pets,
  practices,
  sessions,
  appointments,
  administratorAccessiblePractices,
  // Add the new custom field tables to the main schema export object
  customFieldCategories,
  customFieldGroups,
  customFieldValues,
};

// Re-export all tables and their relations for Drizzle to use
export * from './schemas/practicesSchema';
export * from './schemas/sessionsSchema';
export * from './schemas/usersSchema';
export * from './schemas/appointmentsSchema';
export * from './schemas/petsSchema';
// Re-export the new custom field schemas
export * from './schemas/customFieldsSchema';

// You might also want to re-export the userRoleEnum if it's used elsewhere for typing
export { UserRoleEnum };