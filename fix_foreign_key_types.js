const fs = require('fs');
const path = require('path');

// Tables that use primaryKeyId() (serial integer primary keys)
const serialTables = [
  'practices', 'users', 'pets', 'rooms', 'appointments', 'prescriptions', 
  'customFieldCategories', 'customFieldGroups', 'customFieldValues',
  'addons', 'practiceAddons', 'addonReviews', 'treatments', 'soapNotes',
  'referrals', 'referralResults', 'referralFollowUps', 'healthPlans',
  'inventoryItems', 'labTests', 'labResults', 'labPanels', 'boardingReservations',
  'boardingRooms', 'boardingServices', 'boardingNotes', 'boardingActivities',
  'admissions', 'notifications', 'aiConfig', 'whiteboardItems',
  'dashboardConfigs', 'treatmentTemplates', 'medicalImaging', 'imagingSeries',
  'imagingImages', 'imagingAnnotations', 'imagingMeasurements', 'imagingReports',
  'soapNoteTemplates', 'soapTemplates', 'treatmentTemplateItems', 'sessions'
];

// Function to scan a file for foreign key type mismatches
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    // Look for text fields that reference serial primary key tables
    serialTables.forEach(table => {
      // Pattern: someId: text('some_id').references(() => tableName.id
      const pattern = new RegExp(`\\w+Id:\\s*text\\([^)]+\\)[^}]*\\.references\\(\\(\\)\\s*=>\\s*${table}\\.id`, 'i');
      if (pattern.test(line)) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          table: table,
          issue: `Foreign key should use foreignKeyInt instead of text for ${table}.id reference`
        });
      }
    });
  });
  
  return issues;
}

// Scan all schema files
const schemaDir = path.join(__dirname, 'src/db/schemas');
const files = fs.readdirSync(schemaDir).filter(file => file.endsWith('.ts'));

console.log('Scanning for foreign key type mismatches...\n');

files.forEach(file => {
  const filePath = path.join(schemaDir, file);
  const issues = scanFile(filePath);
  
  if (issues.length > 0) {
    console.log(`\n=== ${file} ===`);
    issues.forEach(issue => {
      console.log(`Line ${issue.line}: ${issue.issue}`);
      console.log(`  ${issue.content}`);
    });
  }
});

console.log('\nScan complete!');
