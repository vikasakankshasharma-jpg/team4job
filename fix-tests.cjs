const fs = require('fs');

const fix = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/await page\.waitForFunction\(\(\) => \(window as any\)\.e2e_directFundJob !== undefined\);\s*await page\.evaluate\(async \(\) => \{\s*(?:console\.log\(.*?\);\s*)?await \(window as any\)\.e2e_directFundJob\(\);\s*\}\);/g, "await page.getByTestId('e2e-direct-fund').click({ force: true });");
  // Also handle simulateError
  content = content.replace(/await \(window as any\)\.e2e_directFundJob\(\{ simulateError: true \}\);/g, "await page.getByTestId('e2e-direct-fund').click({ force: true });");
  fs.writeFileSync(file, content);
};

['tests/e2e/beta-squad-case-1.spec.ts', 'tests/e2e/complete-transaction-cycle.spec.ts', 'tests/e2e/dashboard-financials.spec.ts', 'tests/e2e/variation-orders.spec.ts', 'tests/e2e/beta-squad-batch-2.spec.ts'].forEach(fix);
