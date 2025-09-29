#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of specific files that have import conflicts
const conflictFiles = [
  'src/app/api/appointments/client/[clientId]/route.ts',
  'src/app/api/assigned-checklists/[id]/complete/route.ts',
  'src/app/api/assigned-checklists/[id]/items/route.ts',
  'src/app/api/assigned-checklists/[id]/route.ts',
  'src/app/api/assigned-checklists/route.ts'
];

function fixImportConflicts(filePath) {
  console.log(`Fixing import conflicts in ${filePath}...`);
  
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`  ✗ File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Remove duplicate getUserPractice imports
    const lines = content.split('\n');
    const filteredLines = [];
    let hasGetUserPracticeImport = false;
    let hasGetCurrentTenantDbImport = false;
    
    for (const line of lines) {
      if (line.includes("import { getUserPractice }") && line.includes("@/lib/auth-utils")) {
        if (!hasGetUserPracticeImport) {
          filteredLines.push(line);
          hasGetUserPracticeImport = true;
        }
        // Skip duplicate import
      } else if (line.includes("import { getCurrentTenantDb }") && line.includes("@/lib/tenant-db-resolver")) {
        if (!hasGetCurrentTenantDbImport) {
          filteredLines.push(line);
          hasGetCurrentTenantDbImport = true;
        }
        // Skip duplicate import
      } else {
        filteredLines.push(line);
      }
    }
    
    const fixedContent = filteredLines.join('\n');
    
    if (fixedContent !== content) {
      fs.writeFileSync(fullPath, fixedContent, 'utf8');
      console.log(`  ✓ Fixed import conflicts`);
    } else {
      console.log(`  ✓ No conflicts found`);
    }
    
  } catch (error) {
    console.error(`  ✗ Error fixing ${filePath}:`, error.message);
  }
}

// Process conflict files
console.log(`Fixing import conflicts in ${conflictFiles.length} files...`);
conflictFiles.forEach(fixImportConflicts);
console.log('Import conflict fixes complete!');
