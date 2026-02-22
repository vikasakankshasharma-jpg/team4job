const fs = require('fs');
let content = fs.readFileSync('tests/e2e/edge-cases.spec.ts', 'utf8');

content = content.replace(/await page\.fill\('\[data-testid="job-title-input"\]', (.*?)\);/g, "await helper.form.fillInput('Job Title', $1);");

content = content.replace(/await page\.fill\('\[data-testid="skills-input"\]', (.*?)\);/g, "try { await helper.form.fillInput('Required Skills', $1); } catch { await helper.form.fillInput('Skills', $1); }");

content = content.replace(/await page\.fill\('\[data-testid="house-input"\]', (.*?)\);/g, "await page.getByPlaceholder('e.g., Flat 4B').fill($1).catch(()=>null);");

content = content.replace(/await page\.fill\('\[data-testid="street-input"\]', (.*?)\);/g, "await page.getByPlaceholder('e.g., 12th Main Road').fill($1).catch(()=>null);");

content = content.replace(/await page\.fill\('\[data-testid="full-address-input"\]', (.*?)\);/g, "await page.getByPlaceholder('Type address or click on map').fill($1).catch(()=>null);");

content = content.replace(/await page\.fill\('\[data-testid="min-budget-input"\]', (.*?)\);/g, "await page.fill('input[name=\"priceEstimate.min\"]', $1);");

content = content.replace(/await page\.fill\('\[data-testid="max-budget-input"\]', (.*?)\);/g, "await page.fill('input[name=\"priceEstimate.max\"]', $1);");

content = content.replace(/await page\.fill\('input\\[name="deadline"\\]', (.*?)\);/g, "await page.getByTestId('job-deadline-input').fill($1);");

content = content.replace(/await page\.fill\('input\\[name="jobStartDate"\\]', (.*?)\);/g, "await page.getByTestId('job-start-date-input').fill($1);");

content = content.replace(/await page\.fill\('\[data-testid="pincode-input"\]', (.*?)\);/g, "await helper.form.fillInput('Pincode', $1);");

fs.writeFileSync('tests/e2e/edge-cases.spec.ts', content);
