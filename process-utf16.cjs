const fs = require('fs');

try {
    const text = fs.readFileSync('e2e-results.json', 'utf16le');
    // Playwright overwrites lines using carriage returns, so we split by \r and \n
    const parts = text.split(/[\r\n]+/);

    const tests = parts.filter(l => l.includes('[chromium]') && l.includes('tests\\e2e'));
    // Because it rewrites lines, we'll see the execution line many times.
    // The final status has a checkmark (pass) or a cross (fail).

    const mapped = tests.map(l => {
        // Clean ANSI escapes
        const clean = l.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
        return clean;
    }).filter(l => l.length > 0);

    const unique = [...new Set(mapped)];

    const failures = unique.filter(l => l.includes('Γ£ÿ') || l.includes('✘') || l.toLowerCase().includes('fail') || l.toLowerCase().includes('timeout'));
    const passes = unique.filter(l => l.includes('✓') || l.includes('Γ£ô'));

    console.log(`Found ${failures.length} potential failures and ${passes.length} passes.`);
    console.log('\nFailures:');
    failures.forEach(f => console.log(f));

} catch (e) {
    console.error(e);
}
