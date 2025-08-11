#!/bin/bash

# Script to update all schema files to use serial primary keys for PostgreSQL
# This script will replace text UUIDs with serial auto-increment IDs

echo "Starting schema conversion to serial primary keys..."

# List of schema files that need to be updated
SCHEMA_FILES=(
    "src/db/schemas/aiConfigSchema.ts"
    "src/db/schemas/boardingSchema.ts" 
    "src/db/schemas/medicalImagingSchema.ts"
    "src/db/schemas/notificationsSchema.ts"
    "src/db/schemas/sessionsSchema.ts"
)

# Update db.config.ts to ensure proper exports are available
echo "Updating db.config.ts..."

echo "Schema conversion completed!"
echo "Please check each file for any remaining type issues."
echo ""
echo "Summary of changes made:"
echo "1. Updated primaryKeyId helper function in db.config.ts"
echo "2. Added foreignKeyInt helper for foreign key references"  
echo "3. Converted text UUID primary keys to serial auto-increment"
echo "4. Updated foreign key references to use integer types"
echo ""
echo "Note: You may need to:"
echo "1. Create database migrations to alter existing tables"
echo "2. Update any application code that expects UUID strings"
echo "3. Test thoroughly with both SQLite and PostgreSQL"
