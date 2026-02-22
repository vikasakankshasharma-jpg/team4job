const fs = require('fs');

const logFile = 'full-test-run.log';
// read file but be aware of UTF-16LE or UTF-8
let logData = fs.readFileSync(logFile, 'utf8');
if (logData.includes('\0')) {
    logData = fs.readFileSync(logFile, 'utf16le');
}

const lines = logData.split('\n');
const failures = [];

const failureRegex = /^\s+(\d+)\)\s+\[chromium\]\s+.*?\s+(tests[\\\/].*)/;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(failureRegex);
    if (match) {
        failures.push(`${match[1]}) ${match[2]}`);
    }
}

console.log(`Found ${failures.length} failures:`);
failures.forEach(f => console.log(f));
