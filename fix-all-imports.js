#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixAllImportConflicts() {
  console.log('Finding all API route files that need fixing...');
  
  try {
    // Get all route files except owner routes
    const result = execSync('find src/app/api -name "route.ts" -not -path "*/owner/*"', { encoding: 'utf8' });
    const files = result.trim().split('\n').filter(f => f);
    
    console.log(`Found ${files.length} files to check`);
    
    let fixedCount = 0;
    
    for (const filePath of files) {
      if (fixImportConflictsInFile(filePath)) {
        fixedCount++;
      }
    }
    
    console.log(`Fixed import conflicts in ${fixedCount} files`);
    
  } catch (error) {
    console.error('Error finding files:', error.message);
  }
}

function fixImportConflictsInFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Split into lines
    const lines = content.split('\n');
    const processedLines = [];
    
    let hasGetUserPracticeImport = false;
    let hasGetCurrentTenantDbImport = false;
    let hasAuthUtilsImport = false;
    let hasTenantDbResolverImport = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for getUserPractice import from auth-utils
      if (line.includes("import { getUserPractice }") && line.includes("@/lib/auth-utils")) {
        if (!hasGetUserPracticeImport) {
          processedLines.push(line);
          hasGetUserPracticeImport = true;
          hasAuthUtilsImport = true;
        }
        // Skip duplicate
        continue;
      }
      
      // Check for getCurrentTenantDb import from tenant-db-resolver
      if (line.includes("import { getCurrentTenantDb }") && line.includes("@/lib/tenant-db-resolver")) {
        if (!hasGetCurrentTenantDbImport) {
          processedLines.push(line);
          hasGetCurrentTenantDbImport = true;
          hasTenantDbResolverImport = true;
        }
        // Skip duplicate
        continue;
      }
      
      // Check for other imports from auth-utils that might conflict
      if (line.includes("from '@/lib/auth-utils'") && !line.includes("getUserPractice")) {
        if (!hasAuthUtilsImport) {
          processedLines.push(line);
          hasAuthUtilsImport = true;
        }
        // Skip duplicate
        continue;
      }
      
      // Check for other imports from tenant-db-resolver that might conflict
      if (line.includes("from '@/lib/tenant-db-resolver'") && !line.includes("getCurrentTenantDb")) {
        if (!hasTenantDbResolverImport) {
          processedLines.push(line);
          hasTenantDbResolverImport = true;
        }
        // Skip duplicate
        continue;
      }
      
      // Keep all other lines
      processedLines.push(line);
    }
    
    const newContent = processedLines.join('\n');
    
    if (newContent !== originalContent) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`  ✓ Fixed imports in ${filePath}`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`  ✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Run the fix
fixAllImportConflicts();
