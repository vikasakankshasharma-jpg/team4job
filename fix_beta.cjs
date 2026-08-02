const fs = require('fs');
let c = fs.readFileSync('tests/e2e/beta-squad-batch-1.spec.ts', 'utf8');
c = c.replace(/await helper\.form\.waitForToast\('([^']+)'\)\.catch/g, "await helper.form.waitForToast('$1', 10000).catch");
fs.writeFileSync('tests/e2e/beta-squad-batch-1.spec.ts', c);
console.log('Fixed beta-squad-batch-1.spec.ts');
