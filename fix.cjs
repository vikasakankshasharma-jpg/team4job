const fs = require('fs');
let content = fs.readFileSync('tests/e2e/edge-cases.spec.ts', 'utf8');

// 1. Remove manual verifyCheckbox clicks 
content = content.replace(/\s*const verifyCheckbox = page\.locator\('text=I verify that these details are correct\.'\)\.locator\('\.\.'\)\.locator\('button\[role="checkbox"\], input\[type="checkbox"\]'\)\.first\(\);\s*if \(await verifyCheckbox\.isVisible\(\{ timeout: 2000 \}\)\.catch\(\(\) => false\)\) \{\s*await verifyCheckbox\.click\(\{ force: true \}\);\s*\}/g, '');

// 2. Replace clickButton('Post Job') with submitPostJob()
content = content.replace(/await helper\.form\.clickButton\('Post Job'\);/g, 'await helper.form.submitPostJob();');

// 3. Update input names to getByTestId (restoring previous fixes)
content = content.replace(/page\.fill\('input\[name="deadline"\]', getDateString\(\d+\)\);/g, 'page.getByTestId("job-deadline-input").fill(getDateString(2));');
content = content.replace(/page\.fill\('input\[name="jobStartDate"\]', getDateTimeString\(\d+\)\);/g, 'page.getByTestId("job-start-date-input").fill(getDateTimeString(72));');

// 4. Fix input[type="file"] to be .first()
content = content.replace(/page\.locator\('input\[type="file"\]'\)\.waitFor/g, "page.locator('input[type=\"file\"]').first().waitFor");
content = content.replace(/page\.locator\('input\[type="file"\]'\)\.setInputFiles/g, "page.locator('input[type=\"file\"]').first().setInputFiles");
content = content.replace(/const fileInput = page\.locator\('input\[type="file"\]'\);/g, "const fileInput = page.locator('input[type=\"file\"]').first();");

// 5. Replace any remaining getDateTimeString(40) just in case
content = content.replace(/getDateTimeString\(40\)/g, 'getDateTimeString(72)');

fs.writeFileSync('tests/e2e/edge-cases.spec.ts', content);
console.log('Restored and fixed edge-cases.spec.ts successfully');
