const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
    const errorCounts = {};
    const warningCounts = {};

    data.forEach(file => {
        file.messages.forEach(msg => {
            const rule = msg.ruleId || 'parsing-error';
            if (msg.severity === 2) {
                errorCounts[rule] = (errorCounts[rule] || 0) + 1;
            } else if (msg.severity === 1) {
                warningCounts[rule] = (warningCounts[rule] || 0) + 1;
            }
        });
    });

    console.log("ERRORS (Severity 2):");
    Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rule, count]) => console.log(`${count}\t${rule}`));

    console.log("\nWARNINGS (Severity 1):");
    Object.entries(warningCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rule, count]) => console.log(`${count}\t${rule}`));

} catch (e) {
    console.error("Error reading or parsing file:", e.message);
}
