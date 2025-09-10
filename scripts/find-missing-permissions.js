const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = ['node_modules', '.git', 'public', 'uploads', 'dist', 'out'];
const PERM_REGEX = /['"]([a-z0-9_]+)_(create|read|update|delete|manage|dispense|process|all|read_only|dispense|manage_all|create_all|update_all)['"]/ig;

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (IGNORE_DIRS.includes(file)) continue;
      walk(full, filelist);
    } else {
      if (/\.ts$|\.tsx$|\.js$|\.jsx$/.test(file)) filelist.push(full);
    }
  }
  return filelist;
}

function extractPermissionsFromFiles(files) {
  const found = new Set();
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = PERM_REGEX.exec(txt)) !== null) {
      found.add(m[1].toLowerCase() + '_' + m[2].toLowerCase());
    }
  }
  return Array.from(found).sort();
}

function extractPermissionsFromSeeder(seederPath) {
  const txt = fs.readFileSync(seederPath, 'utf8');
  const regex = /id:\s*['"]([^'"]+)['"]/g;
  const found = new Set();
  let m;
  while ((m = regex.exec(txt)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return Array.from(found).sort();
}

function main() {
  const files = walk(ROOT);
  const repoPerms = extractPermissionsFromFiles(files);
  const seederPath = path.join(ROOT, 'src', 'db', 'seedRoles.ts');
  const seedPerms = extractPermissionsFromSeeder(seederPath);

  const missing = repoPerms.filter(p => !seedPerms.includes(p));

  console.log('Found permission-like IDs in repo:', repoPerms.length);
  console.log('Permissions in seedRoles.ts:', seedPerms.length);
  console.log('Missing (repo referenced but not in seeder):', missing.length);
  missing.forEach(m => console.log(m));
}

main();
