#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all schema files
const schemaFiles = glob.sync('src/db/schemas/**/*.ts');

console.log('🔍 Checking schema files for auto-increment patterns...\n');

schemaFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check if file has the old pattern
  if (content.includes('integer(') && content.includes('primaryKey({ autoIncrement: true })')) {
    console.log(`📝 ${file}:`);
    
    // Show lines that need updating
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('integer(') && line.includes('primaryKey({ autoIncrement: true })')) {
        console.log(`   Line ${index + 1}: ${line.trim()}`);
        console.log(`   Should be: ${line.trim().replace(/integer\('([^']+)'\)\.primaryKey\(\{ autoIncrement: true \}\)/, "serial('$1')")}`);
      }
    });
    console.log('');
  }
});

console.log('✅ Schema check complete!');
console.log('\n💡 To fix:');
console.log('1. Add "serial" to imports: import { ..., serial } from "@/db/db.config"');
console.log('2. Replace: integer(\'id\').primaryKey({ autoIncrement: true }) → serial(\'id\')');
