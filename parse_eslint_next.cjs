const fs = require('fs');
if (!fs.existsSync('react_warnings.json')) {
  console.log('File not found');
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync('react_warnings.json', 'utf8'));

const results = [];

report.forEach(file => {
  const warnings = file.messages.filter(m => m.ruleId && (m.ruleId.startsWith('react-hooks/') || m.ruleId.startsWith('react/')));
  if (warnings.length > 0) {
    results.push({
      filePath: file.filePath.replace(process.cwd(), ''),
      warnings: warnings.map(w => ({
        line: w.line,
        rule: w.ruleId,
        message: w.message
      }))
    });
  }
});

fs.writeFileSync('react_warnings_filtered.json', JSON.stringify(results, null, 2));
console.log('Found ' + results.length + ' files with React warnings.');
