const fs = require('fs');
const path = require('path');

// Look for .spec.ts files in tests/e2e
const testDir = path.join(__dirname, '../tests/e2e');
const tagPattern = /@\w+/; // simple pattern to catch @smoke, @edge, etc.

// Only validate files modified in this commit/PR. This keeps the check from
// failing existing untagged specs when the rule is added later.
function getChangedFiles() {
  try {
    const { execSync } = require('child_process');
    const output = execSync('git diff --name-only origin/main...HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    // Not a git repo or diff failed – fall back to all specs
    return null;
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.spec.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

let specs = walk(testDir);
const changed = getChangedFiles();
if (changed) {
  specs = specs.filter((f) => changed.includes(path.relative(process.cwd(), f)));
}
let missing = [];
specs.forEach((file) => {
  const contents = fs.readFileSync(file, 'utf8');
  if (!tagPattern.test(contents)) {
    missing.push(path.relative(process.cwd(), file));
  }
});

if (missing.length) {
  console.error('The following spec files contain no @tags (smoke/edge/etc):');
  missing.forEach((f) => console.error('  -', f));
  process.exit(1);
} else {
  console.log('All spec files include at least one @tag.');
}
