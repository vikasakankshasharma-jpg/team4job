const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const EN_FILE = path.join(LOCALES_DIR, 'en.json');

function compareObjects(template, target, path = '') {
    const gaps = [];
    
    for (const key in template) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (!(key in target)) {
            gaps.push({ path: fullPath, type: 'missing' });
            continue;
        }
        
        if (typeof template[key] === 'object' && template[key] !== null) {
            if (typeof target[key] !== 'object') {
                gaps.push({ path: fullPath, type: 'type_mismatch' });
            } else {
                gaps.push(...compareObjects(template[key], target[key], fullPath));
            }
        }
    }
    
    // Check for extra keys (potential localized keys or legacy junk)
    for (const key in target) {
        const fullPath = path ? `${path}.${key}` : key;
        if (!(key in template)) {
            gaps.push({ path: fullPath, type: 'extra' });
        }
    }
    
    return gaps;
}

function run() {
    if (!fs.existsSync(EN_FILE)) {
        console.error('English locale template not found.');
        process.exit(1);
    }
    
    const en = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));
    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');
    
    let totalGaps = 0;
    
    for (const file of files) {
        console.log(`\n--- Checking ${file} ---`);
        const target = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
        const gaps = compareObjects(en, target);
        
        if (gaps.length === 0) {
            console.log('  Perfect parity!');
        } else {
            gaps.forEach(gap => {
                const color = gap.type === 'missing' ? '\x1b[31m' : '\x1b[33m';
                console.log(`  ${color}[${gap.type.toUpperCase()}]\x1b[0m ${gap.path}`);
            });
            totalGaps += gaps.length;
        }
    }
    
    if (totalGaps > 0) {
        console.log(`\nTotal gaps found: ${totalGaps}`);
    } else {
        console.log('\nAll checked locales are in sync with en.json!');
    }
}

run();
