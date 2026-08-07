const fs = require('fs');

const files = [
    'tests/e2e/beta-squad-batch-1.spec.ts',
    'tests/e2e/beta-squad-batch-2.spec.ts',
    'tests/e2e/beta-squad-batch-3.spec.ts',
    'tests/e2e/beta-squad-batch-4.spec.ts',
    'tests/e2e/beta-squad-batch-5.spec.ts'
];

for (const file of files) {
    if (!fs.existsSync(file)) { console.log('Not found: ' + file); continue; }
    let content = fs.readFileSync(file, 'utf8');

    // Strategy: Replace inline confirmBtn pattern after sendOfferByTestId.click()
    // Old pattern (multi-line) in batch-1 through batch-5
    const oldSnippet1 = `await sendOfferByTestId.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();`;
    const newSnippet1 = `await sendOfferByTestId.click();
                await helper.job.handleAuthorizationModal();`;

    const oldSnippet2 = `await sendOfferByTestId.click();
            const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
            await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await confirmBtn.isVisible()) await confirmBtn.click();`;
    const newSnippet2 = `await sendOfferByTestId.click();
            await helper.job.handleAuthorizationModal();`;

    // Also handle reviewAwardButton variant
    const oldSnippet3 = `await reviewAwardButton.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();`;
    const newSnippet3 = `await reviewAwardButton.click();
                await helper.job.handleAuthorizationModal();`;

    const oldSnippet4 = `await sendOfferButton.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();`;
    const newSnippet4 = `await sendOfferButton.click();
                await helper.job.handleAuthorizationModal();`;

    let updated = content;
    updated = updated.split(oldSnippet1).join(newSnippet1);
    updated = updated.split(oldSnippet2).join(newSnippet2);
    updated = updated.split(oldSnippet3).join(newSnippet3);
    updated = updated.split(oldSnippet4).join(newSnippet4);

    if (updated !== content) {
        fs.writeFileSync(file, updated, 'utf8');
        console.log('Patched: ' + file);
    } else {
        console.log('No inline match - trying regex for: ' + file);
        // Count existing confirmBtn patterns
        const count = (content.match(/Official Authorization/g) || []).length;
        console.log('  -> ' + count + ' occurrences of Official Authorization');
    }
}
