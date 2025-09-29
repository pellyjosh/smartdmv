const fs = require('fs');
const path = require('path');

// Get all dynamic route files
const { execSync } = require('child_process');
const dynamicRoutes = execSync('find src/app/api -path "*/\\[*\\]/*" -name "route.ts"', { encoding: 'utf-8' })
  .split('\n')
  .filter(file => file.trim())
  .filter(file => !file.includes('/owner/')); // Exclude owner routes

console.log(`Found ${dynamicRoutes.length} dynamic route files to check...`);

let fixedFiles = 0;

dynamicRoutes.forEach((filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if file has the problematic pattern: params: { ... }
    const hasDirectParamsAccess = /{\s*params\s*}:\s*{\s*params:\s*{\s*[^}]+\s*}\s*}/.test(content);
    
    if (hasDirectParamsAccess) {
      console.log(`Fixing ${filePath}...`);
      
      // Replace the pattern with Promise version
      let updatedContent = content.replace(
        /{\s*params\s*}:\s*{\s*params:\s*{\s*([^}]+)\s*}\s*}/g,
        '{ params }: { params: Promise<{ $1 }> }'
      );
      
      // Find and replace params.property access patterns
      const paramMatches = [...content.matchAll(/params\.(\w+)/g)];
      if (paramMatches.length > 0) {
        // Insert await params at the beginning of functions where params are used
        const paramNames = [...new Set(paramMatches.map(match => match[1]))];
        
        // Find function bodies where params are accessed
        const exportFunctionRegex = /export\s+async\s+function\s+\w+\([^)]+\)\s*{/g;
        
        updatedContent = updatedContent.replace(exportFunctionRegex, (match) => {
          return match + '\n  const resolvedParams = await params;';
        });
        
        // Replace params.property with resolvedParams.property
        paramNames.forEach(paramName => {
          updatedContent = updatedContent.replace(
            new RegExp(`params\\.${paramName}`, 'g'),
            `resolvedParams.${paramName}`
          );
        });
        
        fs.writeFileSync(filePath, updatedContent);
        fixedFiles++;
        console.log(`✅ Fixed ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n✅ Fixed ${fixedFiles} files with params issues.`);
