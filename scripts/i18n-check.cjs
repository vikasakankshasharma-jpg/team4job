const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const isFix = process.argv.includes('--fix');

const REPLACEMENTS = [
    { bad: /â€¢/g, good: '•' },
    { bad: /ðŸ ›/g, good: '🐛' },
    { bad: /ðŸ’¡/g, good: '💡' },
    { bad: /ðŸ”§/g, good: '🔧' },
    { bad: /ðŸ“ /g, good: '📌' },
    { bad: /â€¦/g, good: '…' },
    { bad: /â‚¹/g, good: '₹' },
    { bad: /â€“/g, good: '–' },
    { bad: /â€™/g, good: "'" },
    { bad: /â€œ/g, good: '"' },
    { bad: /â€ /g, good: '"' }
];

let hasErrors = false;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let needsFix = false;

    for (const { bad, good } of REPLACEMENTS) {
        if (bad.test(content)) {
            needsFix = true;
            if (isFix) {
                content = content.replace(bad, good);
            }
        }
    }

    if (needsFix) {
        if (isFix) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed encoding in ${path.basename(filePath)}`);
        } else {
            console.error(`Encoding errors found in ${path.basename(filePath)}. Run 'npm run lint:i18n:fix' to resolve.`);
            hasErrors = true;
        }
    }
}

function run() {
    if (!fs.existsSync(LOCALES_DIR)) {
        console.log('Locales directory not found.');
        return;
    }

    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        processFile(path.join(LOCALES_DIR, file));
    }

    if (hasErrors) {
        process.exit(1);
    } else {
        console.log('i18n encoding check passed.');
    }
}

run();
