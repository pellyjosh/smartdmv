#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files to update (excluding owner routes)
const filesToUpdate = [
  'src/app/api/ai-config/bulk/route.ts',
  'src/app/api/ai-config/route.ts',
  'src/app/api/audit-logs/test/route.ts',
  'src/app/api/audit-logs/[recordType]/route.ts',
  'src/app/api/audit-logs/[recordType]/export/route.ts',
  'src/app/api/practitioners/client/route.ts',
  'src/app/api/imaging-series/[seriesId]/annotations/route.ts',
  'src/app/api/imaging-series/[seriesId]/measurements/route.ts',
  'src/app/api/messages/client/route.ts',
  'src/app/api/widget/config/route.ts',
  'src/app/api/widget/booking/route.ts',
  'src/app/api/widget/availability/route.ts',
  'src/app/api/contact-veterinarian/route.ts',
  'src/app/api/appointments/by-date/[date]/route.ts',
  'src/app/api/appointments/by-date-range/route.ts',
  'src/app/api/appointments/room/[roomId]/route.ts',
  'src/app/api/appointments/pet/[petId]/route.ts',
  'src/app/api/appointments/route.ts',
  'src/app/api/appointments/[id]/start-telemedicine/route.ts',
  'src/app/api/appointments/[id]/route.ts',
  'src/app/api/appointments/[id]/end-telemedicine/route.ts',
  'src/app/api/appointments/client/[clientId]/route.ts',
  'src/app/api/appointments/client/route.ts',
  'src/app/api/auth/clients/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/treatments/soap-note/[soapNoteId]/route.ts',
  'src/app/api/treatments/route.ts',
  'src/app/api/treatments/[id]/route.ts',
  'src/app/api/users-with-audit/route.ts',
  'src/app/api/whiteboard/route.ts',
  'src/app/api/whiteboard/[id]/route.ts',
  'src/app/api/permission-overrides/user/[userId]/route.ts',
  'src/app/api/permission-overrides/route.ts',
  'src/app/api/pets/route.ts',
  'src/app/api/pets/[petId]/[clientId]/route.ts',
  'src/app/api/pets/[petId]/appointments/route.ts',
  'src/app/api/pets/[petId]/medical-records/route.ts',
  'src/app/api/pets/[petId]/route.ts',
  'src/app/api/pets/[petId]/vaccinations/route.ts',
  'src/app/api/pets/[petId]/timeline/route.ts',
  'src/app/api/pets/client/route.ts',
  'src/app/api/referrals/route.ts',
  'src/app/api/referrals/inbound/route.ts',
  'src/app/api/referrals/outbound/route.ts',
  'src/app/api/referrals/[id]/status/route.ts',
  'src/app/api/signatures/route.ts',
  'src/app/api/signatures/[id]/route.ts',
  'src/app/api/treatment-templates/route.ts',
  'src/app/api/treatment-templates/[id]/route.ts',
  'src/app/api/treatment-templates/[id]/items/route.ts',
  'src/app/api/user-roles/statistics/route.ts',
  'src/app/api/user-roles/[userId]/route.ts',
  'src/app/api/marketplace/addons/route.ts',
  'src/app/api/marketplace/addons/featured/route.ts',
  'src/app/api/marketplace/addons/[slug]/route.ts',
  'src/app/api/marketplace/checkout/route.ts',
  'src/app/api/marketplace/subscriptions/route.ts',
  'src/app/api/marketplace/practice/[practiceId]/cancel/route.ts',
  'src/app/api/marketplace/practice/[practiceId]/subscribe/route.ts',
  'src/app/api/lab/test-catalog/route.ts',
  'src/app/api/lab/providers/route.ts',
  'src/app/api/lab/providers/[id]/route.ts',
  'src/app/api/lab/results/pet/[petId]/route.ts',
  'src/app/api/lab/results/route.ts',
  'src/app/api/lab/orders/route.ts',
  'src/app/api/lab/orders/[id]/route.ts',
  'src/app/api/admin/dashboard-configs/[id]/route.ts',
  'src/app/api/admin/health-resources/route.ts',
  'src/app/api/admin/health-resources/[id]/route.ts',
  'src/app/api/admin/contact-requests/route.ts',
  'src/app/api/admin/contact-requests/[id]/read/route.ts',
  'src/app/api/practice-admin/users/route.ts',
  'src/app/api/roles/route.ts',
  'src/app/api/roles/[id]/route.ts',
  'src/app/api/soap-templates/route.ts',
  'src/app/api/soap-templates/[id]/route.ts',
  'src/app/api/health-resources/route.ts',
  'src/app/api/health-resources/[id]/route.ts',
  'src/app/api/health-plans/route.ts',
  'src/app/api/health-plans/[planId]/notes/route.ts',
  'src/app/api/health-plans/[planId]/route.ts',
  'src/app/api/health-plans/[planId]/milestones/route.ts',
  'src/app/api/health-plans/client/route.ts',
  'src/app/api/soap/appointments/route.ts',
  'src/app/api/user-assignments/route.ts',
  'src/app/api/appointment-requests/[id]/reject/route.ts',
  'src/app/api/appointment-requests/[id]/approve/route.ts',
  'src/app/api/appointment-requests/[id]/route.ts',
  'src/app/api/dashboard/appointments/route.ts',
  'src/app/api/dashboard/notifications/route.ts',
  'src/app/api/checklist-items/route.ts',
  'src/app/api/checklist-items/my-items/route.ts',
  'src/app/api/checklist-items/[id]/complete/route.ts',
  'src/app/api/checklist-items/[id]/route.ts',
  'src/app/api/checklist-items/checklist/[checklistId]/route.ts',
  'src/app/api/medication-interactions/by-medication/[id]/route.ts',
  'src/app/api/medication-interactions/route.ts',
  'src/app/api/medication-interactions/[id]/route.ts',
  'src/app/api/permission-categories/route.ts',
  'src/app/api/permission-categories/[id]/toggle/route.ts',
  'src/app/api/permission-categories/[id]/route.ts',
  'src/app/api/test-soap/route.ts',
  'src/app/api/whiteboard-notes/route.ts',
  'src/app/api/assigned-checklists/route.ts',
  'src/app/api/assigned-checklists/[id]/complete/route.ts',
  'src/app/api/assigned-checklists/[id]/route.ts',
  'src/app/api/assigned-checklists/[id]/items/route.ts',
  'src/app/api/soap-notes/route.ts',
  'src/app/api/soap-notes/[id]/lock/route.ts',
  'src/app/api/soap-notes/[id]/route.ts',
  'src/app/api/inventory/batch-adjust/route.ts',
  'src/app/api/inventory/batch-delete/route.ts',
  'src/app/api/inventory/route.ts',
  'src/app/api/inventory/[id]/adjust/route.ts',
  'src/app/api/inventory/[id]/transactions/route.ts',
  'src/app/api/inventory/[id]/route.ts',
  'src/app/api/inventory/reports/low-stock/route.ts',
  'src/app/api/users/vets/route.ts',
  'src/app/api/users/staff/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/admissions/route.ts',
  'src/app/api/veterinarians/specialists/route.ts',
  'src/app/api/veterinarians/route.ts',
  'src/app/api/administrator/practices/route.ts',
  'src/app/api/db/migrate-audit/route.ts',
  'src/app/api/medical-record-attachments/delete/[id]/route.ts',
  'src/app/api/medical-record-attachments/file/[id]/route.ts',
  'src/app/api/medical-record-attachments/route.ts',
  'src/app/api/medical-record-attachments/[recordType]/[recordId]/route.ts',
  'src/app/api/admission-rooms/route.ts',
  'src/app/api/vaccinations/types/species/[species]/route.ts',
  'src/app/api/vaccinations/types/route.ts',
  'src/app/api/vaccinations/types/[id]/route.ts',
  'src/app/api/vaccinations/due/route.ts',
  'src/app/api/vaccinations/pet/[petId]/route.ts',
  'src/app/api/vaccinations/route.ts',
  'src/app/api/vaccinations/[id]/route.ts',
  'src/app/api/vaccinations/expiring/route.ts',
  'src/app/api/external/appointment-requests/route.ts',
  'src/app/api/custom-fields/values/group/[groupId]/route.ts',
  'src/app/api/custom-fields/groups/practice/[practiceId]/route.ts',
  'src/app/api/custom-fields/categories/practice/[practiceId]/route.ts',
  'src/app/api/practice/pets/[practiceId]/route.ts',
  'src/app/api/integration-settings/generate-api-key/route.ts',
  'src/app/api/integration-settings/practice-data/route.ts',
  'src/app/api/integration-settings/route.ts',
  'src/app/api/integration-settings/verify-website/route.ts',
  'src/app/api/lab-results/route.ts',
  'src/app/api/audit-reports/statistics/route.ts',
  'src/app/api/audit-reports/reports/route.ts',
  'src/app/api/boarding/requirements/route.ts',
  'src/app/api/boarding/stays/route.ts',
  'src/app/api/boarding/stays/[id]/cancel/route.ts',
  'src/app/api/boarding/stays/[id]/check-in/route.ts',
  'src/app/api/boarding/stays/[id]/route.ts',
  'src/app/api/boarding/stays/[id]/check-out/route.ts',
  'src/app/api/boarding/activities/route.ts',
  'src/app/api/boarding/kennels/route.ts',
  'src/app/api/boarding/kennels/[id]/route.ts',
  'src/app/api/boarding/feeding-schedules/route.ts',
  'src/app/api/boarding/feeding-schedules/[id]/route.ts',
  'src/app/api/boarding/medication-schedules/route.ts',
  'src/app/api/boarding/medication-schedules/[id]/route.ts',
  'src/app/api/medical-imaging/[imagingId]/series/route.ts',
  'src/app/api/medical-imaging/pet/[petId]/route.ts',
  'src/app/api/medical-imaging/route.ts',
  'src/app/api/prescriptions/route.ts',
  'src/app/api/prescriptions/[id]/dispense/route.ts',
  'src/app/api/notifications/[id]/read/route.ts',
  'src/app/api/notifications/client/route.ts',
  'src/app/api/billing/payments/route.ts',
  'src/app/api/billing/invoices/route.ts',
  'src/app/api/billing/payment-methods/route.ts',
  'src/app/api/practices/[practiceId]/route.ts',
  'src/app/api/client-portal/checklists/route.ts',
  'src/app/api/template-items/route.ts',
  'src/app/api/template-items/[id]/route.ts',
  'src/app/api/health-plan-milestones/[id]/toggle/route.ts'
];

function updateFile(filePath) {
  console.log(`Updating ${filePath}...`);
  
  try {
    const fullPath = path.resolve(filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Skip if already has tenant imports
    if (content.includes('getCurrentTenantDb')) {
      console.log(`  ✓ Already updated`);
      return;
    }

    // Skip if doesn't have db import
    if (!content.includes("import { db }") && !content.includes("from '@/db'") && !content.includes('from "@/db')) {
      console.log(`  ✓ No db import found`);
      return;
    }
    
    let modified = false;
    
    // Replace db import with tenant imports
    const dbImportRegex = /import\s*{\s*db\s*}\s*from\s*['"]@\/db['"]/g;
    if (content.match(dbImportRegex)) {
      content = content.replace(dbImportRegex, '');
      modified = true;
    }

    // Replace db import with /index
    const dbIndexImportRegex = /import\s*{\s*db\s*}\s*from\s*['"]@\/db\/index['"]/g;
    if (content.match(dbIndexImportRegex)) {
      content = content.replace(dbIndexImportRegex, '');
      modified = true;
    }

    // Add tenant imports at the top (after other imports)
    const importRegex = /^(import.*\n)+/m;
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      const existingImports = importMatch[0];
      
      // Check if auth-utils import exists
      let newImports = existingImports;
      if (!newImports.includes("getUserPractice")) {
        newImports += "import { getUserPractice } from '@/lib/auth-utils';\n";
      }
      if (!newImports.includes("getCurrentTenantDb")) {
        newImports += "import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';\n";
      }
      
      content = content.replace(importRegex, newImports);
      modified = true;
    }

    // Add tenantDb initialization to each function
    const functionRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*{/g;
    let match;
    const functionMatches = [];
    
    while ((match = functionRegex.exec(content)) !== null) {
      functionMatches.push({
        method: match[1],
        index: match.index,
        length: match[0].length
      });
    }

    // Process functions from bottom to top to maintain indices
    for (let i = functionMatches.length - 1; i >= 0; i--) {
      const func = functionMatches[i];
      const insertIndex = func.index + func.length;
      const beforeInsert = content.substring(0, insertIndex);
      const afterInsert = content.substring(insertIndex);
      
      // Check if tenantDb is already initialized in this function
      const nextFunctionIndex = i < functionMatches.length - 1 ? functionMatches[i + 1].index : content.length;
      const functionBody = content.substring(insertIndex, nextFunctionIndex);
      
      if (!functionBody.includes('getCurrentTenantDb()')) {
        const tenantDbInit = '\n  // Get the tenant-specific database\n  const tenantDb = await getCurrentTenantDb();\n';
        content = beforeInsert + tenantDbInit + afterInsert;
        modified = true;
      }
    }

    // Replace all db. with tenantDb.
    content = content.replace(/\bdb\./g, 'tenantDb.');
    if (content.includes('tenantDb.')) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`  ✓ Updated successfully`);
    } else {
      console.log(`  ✓ No changes needed`);
    }
    
  } catch (error) {
    console.error(`  ✗ Error updating ${filePath}:`, error.message);
  }
}

// Process all files
console.log(`Starting update of ${filesToUpdate.length} files...`);
filesToUpdate.forEach(updateFile);
console.log('Update complete!');
