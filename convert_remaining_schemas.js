#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemasDir = path.join(__dirname, 'src/db/schemas');

// List of schemas that still need conversion
const schemasToConvert = [
  'medicalImagingSchema.ts',
  'customFieldsSchema.ts', 
  'referralsSchema.ts',
  'inventorySchema.ts',
  'soapNoteSchema.ts',
  'treatmentsSchema.ts',
  'treatmentTemplateSchema.ts'
];

function convertSchemaFile(filePath) {
  console.log(`Converting ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove isSqlite variable declaration
  content = content.replace(/const isSqlite = process\.env\.DB_TYPE === 'sqlite';\n?\n?/g, '');
  
  // Update imports - add primaryKeyId and foreignKeyInt if they reference integer primary keys
  if (content.includes('integer(') && content.includes('.primaryKey(')) {
    content = content.replace(
      /import { ([^}]+) } from '@\/db\/db\.config';/,
      (match, imports) => {
        let newImports = imports.split(',').map(imp => imp.trim());
        if (!newImports.includes('primaryKeyId')) {
          newImports.push('primaryKeyId');
        }
        if (content.includes('integer(') && !newImports.includes('foreignKeyInt')) {
          newImports.push('foreignKeyInt');
        }
        return `import { ${newImports.join(', ')} } from '@/db/db.config';`;
      }
    );
  }
  
  // Remove serial import
  content = content.replace(/import { serial[^}]*} from 'drizzle-orm\/pg-core';\n?/g, '');
  
  // Replace integer primary keys with primaryKeyId()
  content = content.replace(
    /id: integer\('id'\)\.primaryKey\(\{ autoIncrement: true \}\)\.notNull\(\)/g,
    "id: primaryKeyId()"
  );
  
  // Replace other integer references with foreignKeyInt (but be careful not to replace legitimate integers)
  content = content.replace(/integer\(/g, 'foreignKeyInt(');
  
  // Fix .default() calls that should use sql`` for text values
  content = content.replace(/\.default\('([^']+)'\)/g, (match, value) => {
    // Only wrap in sql if it's not a number
    if (isNaN(value) && value !== 'true' && value !== 'false') {
      return `.default(sql\`'${value}'\`)`;
    }
    return match;
  });
  
  // Replace conditional timestamp patterns - handle createdAt first
  content = content.replace(
    /createdAt: isSqlite\s*\?\s*timestamp\('[^']*',\s*\{\s*mode:\s*'timestamp_ms'\s*\}\)[^}]+\}\)\s*:\s*timestamp\('([^']*)',\s*\{\s*mode:\s*'date'\s*\}\)\.default\(sql`CURRENT_TIMESTAMP`\)\.notNull\(\)/g,
    "createdAt: timestamp('$1', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull()"
  );
  
  // Replace conditional timestamp patterns - handle updatedAt
  content = content.replace(
    /updatedAt: isSqlite\s*\?\s*timestamp\('[^']*',\s*\{\s*mode:\s*'timestamp_ms'\s*\}\)[^}]+\}\)[^:]*:\s*timestamp\('([^']*)',\s*\{\s*mode:\s*'date'\s*\}\)[^,]*,/g,
    "updatedAt: timestamp('$1', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),"
  );
  
  // Handle simple timestamp replacements
  content = content.replace(
    /(\w+): isSqlite\s*\?\s*timestamp\('[^']*',\s*\{\s*mode:\s*'timestamp_ms'\s*\}\)[^}]*\}\)\s*:\s*timestamp\('([^']*)',\s*\{\s*mode:\s*'date'\s*\}\)[^,\n}]*/g,
    "$1: timestamp('$2', { mode: 'date' })"
  );
  
  // Clean up any remaining isSqlite references
  content = content.replace(
    /(\w+): isSqlite[^,}]+/g,
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
