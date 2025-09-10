// Simple audit script to find legacy role checks in admin pages
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src', 'app', '(main)', 'admin');
const results = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && full.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((l, idx) => {
        if (/user\.?role\s*===|UserRoleEnum|user\.?role\s*!==/.test(l)) {
          results.push({ file: full, line: idx + 1, text: l.trim() });
        }
      });
    }
  }
}

walk(root);

if (results.length === 0) {
  console.log('No legacy role checks found in admin pages.');
  process.exit(0);
}

for (const r of results) {
  console.log(`${r.file}:${r.line}: ${r.text}`);
}

console.log(`\nFound ${results.length} legacy role checks.`);
