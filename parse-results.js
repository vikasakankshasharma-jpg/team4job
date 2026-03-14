const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('e2e-results.json', 'utf8'));
    const failures = [];

    function processSpec(spec) {
        if (!spec.ok) {
            const errorMsg = spec.tests[0]?.results[0]?.error?.message || 'Unknown Error';
            failures.push({
                title: spec.title,
                file: spec.file,
                errorExcerpt: errorMsg.slice(0, 150)
            });
        }
    }

    function processSuite(suite) {
        suite.specs.forEach(processSpec);
        suite.suites.forEach(processSuite);
    }

    data.suites.forEach(processSuite);

    // Filter out the seed-users timeouts as they are environmental
    const logicFailures = failures.filter(f => !f.errorExcerpt.includes('apiRequestContext.post: Timeout'));

    console.log(`Total Failures: ${failures.length}`);
    console.log(`Logic Failures: ${logicFailures.length}`);
    console.log('\n--- Logic Failures ---');
    logicFailures.forEach(f => {
        console.log(`- ${f.title} (${f.file})`);
        console.log(`  Error: ${f.errorExcerpt.replace(/\n/g, ' ')}\n`);
    });

} catch (e) {
    console.error("Failed to parse", e);
}
