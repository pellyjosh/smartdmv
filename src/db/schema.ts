import { users, administratorAccessiblePractices } from './schemas/usersSchema';
import { practices } from './schemas/practicesSchema';
import { sessions } from './schemas/sessionsSchema';

export const schema = {
  users,
  practices,
  sessions,
  administratorAccessiblePractices,
};

// Re-export all tables and their relations for Drizzle to use
export * from './schemas/practicesSchema';
export * from './schemas/sessionsSchema';
export * from './schemas/usersSchema';