#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemasDir = path.join(__dirname, 'src/db/schemas');

// List of schemas that need to be converted (excluding ones already done)
const schemasToConvert = [
  'marketplaceSchema.ts',
  'treatmentsSchema.ts',
  'medicalImagingSchema.ts',
  'customFieldsSchema.ts',
  'referralsSchema.ts',
  'inventorySchema.ts',
  'soapNoteSchema.ts',
  'treatmentTemplateSchema.ts'
];

function convertSchemaFile(filePath) {
  console.log(`Converting ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove isSqlite variable declaration
  content = content.replace(/const isSqlite = process\.env\.DB_TYPE === 'sqlite';\n?\n?/g, '');
  
  // Update imports to remove serial and integer, add primaryKeyId and foreignKeyInt
  content = content.replace(
    /import { dbTable, text, timestamp, integer([^}]*)} from '@\/db\/db\.config';/g,
    (match) => {
      // Remove integer from imports and add primaryKeyId, foreignKeyInt if not present
      let imports = match.replace(', integer', '');
      if (!imports.includes('primaryKeyId')) {
        imports = imports.replace('} from', ', primaryKeyId} from');
      }
      if (!imports.includes('foreignKeyInt') && match.includes('integer')) {
        imports = imports.replace('} from', ', foreignKeyInt} from');
      }
      return imports;
    }
  );
  
  // Remove serial import
  content = content.replace(/import { serial[^}]*} from 'drizzle-orm\/pg-core';\n?/g, '');
  
  // Replace conditional id fields with primaryKeyId()
  content = content.replace(
    /id: isSqlite\s*\?\s*integer\('id'\)\.primaryKey\(\{ autoIncrement: true \}\)\s*:\s*serial\('id'\)\.primaryKey\(\)\.notNull\(\)/g,
    "id: primaryKeyId()"
  );
  
  // Replace integer field references with foreignKeyInt for foreign keys
  content = content.replace(/integer\(/g, 'foreignKeyInt(');
  
  // Replace conditional timestamp patterns with PostgreSQL-only versions
  content = content.replace(
    /(\w+): isSqlite\s*\?\s*timestamp\('[^']+',\s*\{\s*mode:\s*'timestamp_ms'\s*\}\)[^}]*\}\)\s*:\s*timestamp\('[^']+',\s*\{\s*mode:\s*'date'\s*\}\)\.default\(sql`CURRENT_TIMESTAMP`\)\.notNull\(\)/g,
    "$1: timestamp('$1', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull()"
  );
  
  content = content.replace(
    /(\w+): isSqlite\s*\?\s*timestamp\('[^']+',\s*\{\s*mode:\s*'timestamp_ms'\s*\}\)[^}]*\}\)[^:]*:\s*timestamp\('[^']+',\s*\{\s*mode:\s*'date'\s*\}\)\.notNull\(\)\.default\(sql`CURRENT_TIMESTAMP`\)[^,]*,/g,
    "$1: timestamp('$1', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),"
  );
  
  // Replace more complex timestamp patterns
  content = content.replace(
    /createdAt: isSqlite[^:]*:[^,]*,\n\s*updatedAt: isSqlite[^,]*,/gs,
    `createdAt: timestamp('createdAt', { mode: 'date' }).default(sql\`CURRENT_TIMESTAMP\`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql\`CURRENT_TIMESTAMP\`).$onUpdate(() => sql\`CURRENT_TIMESTAMP\`),`
  );
  
  // Handle individual timestamp replacements
  content = content.replace(
    /(\w+): isSqlite\s*\?\s*timestamp\('[^']*',\s*\{\s*mode:\s*'timestamp_ms'\s*\}\)[^}]*\}\)\s*:\s*timestamp\('([^']*)',\s*\{\s*mode:\s*'date'\s*\}\)[^,\n}]*/g,
    "$1: timestamp('$2', { mode: 'date' })"
  );
  
  // Clean up any remaining isSqlite references in timestamps
  content = content.replace(
    /(\w+): isSqlite[^,}]*/g,
    "$1: timestamp('$1', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull()"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Converted ${filePath} successfully`);
}

// Convert all specified schemas
schemasToConvert.forEach(schemaFile => {
  const filePath = path.join(schemasDir, schemaFile);
  if (fs.existsSync(filePath)) {
    convertSchemaFile(filePath);
  } else {
    console.log(`File ${filePath} not found, skipping...`);
  }
});

console.log('Schema conversion completed!');
