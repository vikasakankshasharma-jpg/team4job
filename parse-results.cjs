const fs = require('fs');
try {
    const content = fs.readFileSync('e2e-results.json', 'utf8');
    const lines = content.split('\n');

    const passed = [];
    const failed = [];

    // The characters might be garbled, so we look for patterns
    // "  ✓  1 [chromium] ›" or "  ✘  2 [chromium] ›"
    // Even with garbled chars, " [chromium] " is consistent.

    lines.forEach(line => {
        if (line.includes('[chromium] ›')) {
            // Check if it's a pass or fail
            // A pass usually has a checkmark (or garbled checkmark)
            // We can also see if it says "(failed)" or look at the prefix.
            // Usually, failures are printed again at the end, but since we killed it, we only have the inline ones.

            // Let's print out all lines with [chromium] to see what they look like
            // Since we want to distinguish pass vs fail, let's look for timing at the end like "(5.3s)"
            // Actually, if we just want a list of ALL tests that were executed:
            if (line.match(/(✓|✘|Γ£ÿ|Γ£ô|\d+ \s*\[chromium\])/)) {
                if (line.includes('Γ£ÿ') || line.includes('✘') || line.includes('fail') || line.includes('Timeout')) {
                    failed.push(line.trim());
                } else if (line.includes('✓') || line.includes('Γ£ô')) {
                    // It's a pass
                    passed.push(line.trim());
                } else {
                    // Might be a running test or a fail logging
                    failed.push(line.trim());
                }
            }
        }
    });

    const uniqueFailures = [...new Set(failed)];
    console.log(`Failed/Timeout Tests (${uniqueFailures.length}):`);
    uniqueFailures.forEach(f => console.log(f));

} catch (e) {
    console.error(e);
}
