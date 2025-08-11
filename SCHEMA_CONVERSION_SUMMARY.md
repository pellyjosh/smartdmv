# Schema Conversion Summary

This document outlines the changes needed to convert all schemas to use serial primary keys for PostgreSQL.

## Files Updated

### Core Changes Made

1. **Updated `src/db/db.config.ts`**:

   - Added `primaryKeyId()` helper function
   - Added `foreignKeyInt()` helper for integer foreign keys
   - Added `foreignKeyText()` helper for text foreign keys

2. **Already Updated Schema Files**:
   - `src/db/schemas/usersSchema.ts` - ✅ Updated to use primaryKeyId()
   - `src/db/schemas/practicesSchema.ts` - ✅ Updated to use primaryKeyId()
   - `src/db/schemas/petsSchema.ts` - ✅ Updated to use primaryKeyId() and foreignKeyInt()
   - `src/db/schemas/healthPlansSchema.ts` - ✅ Updated to use primaryKeyId() and foreignKeyInt()
   - `src/db/schemas/appointmentsSchema.ts` - ✅ Updated to use primaryKeyId() and foreignKeyInt()

## Files Still Needing Updates

### Schemas with text UUID primary keys:

1. `src/db/schemas/aiConfigSchema.ts`
2. `src/db/schemas/boardingSchema.ts` (multiple tables)
3. `src/db/schemas/medicalImagingSchema.ts` (multiple tables)
4. `src/db/schemas/notificationsSchema.ts`
5. `src/db/schemas/sessionsSchema.ts`

### Tables Already Using Serial (No Changes Needed):

- `admissionsSchema.ts` - ✅ Already uses serial
- `roomsSchema.ts` - ✅ Already uses serial
- `dashboardConfigsSchema.ts` - ✅ Already uses serial
- `treatmentTemplatesSchema.ts` - ✅ Already uses serial
- `treatmentsSchema.ts` - ✅ Already uses serial
- `soapTemplatesSchema.ts` - ✅ Already uses serial
- `labSchema.ts` - ✅ Already uses serial
- `soapNoteTemplateSchema.ts` - ✅ Already uses serial
- `soapNoteSchema.ts` - ✅ Already uses serial
- `treatmentTemplateSchema.ts` - ✅ Already uses serial
- `marketplaceSchema.ts` - ✅ Already uses serial
- `whiteboardItemsSchema.ts` - ✅ Already uses serial
- `customFieldsSchema.ts` - ✅ Already uses serial

## Pattern for Updates

### 1. Import Changes

```typescript
// Before
import { dbTable, text, timestamp } from "@/db/db.config";

// After
import {
  dbTable,
  text,
  timestamp,
  primaryKeyId,
  foreignKeyInt,
} from "@/db/db.config";
```

### 2. Primary Key Changes

```typescript
// Before
id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

// After
id: primaryKeyId(),
```

### 3. Foreign Key Changes

```typescript
// Before
userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),

// After
userId: foreignKeyInt('user_id').references(() => users.id as any, { onDelete: 'cascade' }),
```

## Important Notes

1. **Type Safety**: Using `as any` in references temporarily bypasses type conflicts
2. **Database Migrations**: You'll need migrations to alter existing tables
3. **Application Code**: Update any code expecting UUID strings to handle integer IDs
4. **Mixed Support**: The current setup maintains SQLite compatibility with conditional logic

## Next Steps

1. Complete the remaining schema updates
2. Generate and run database migrations
3. Update application code that handles IDs
4. Test thoroughly with both database types
5. Consider whether to keep mixed UUID/serial approach or standardize completely
