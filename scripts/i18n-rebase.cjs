const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const EN_FILE = path.join(LOCALES_DIR, 'en.json');

function rebase(template, target) {
    const result = {};
    
    for (const key in template) {
        if (typeof template[key] === 'object' && template[key] !== null) {
            result[key] = rebase(template[key], target[key] || {});
        } else {
            // Keep target translation if it exists, otherwise use template (EN)
            result[key] = (key in target && typeof target[key] === 'string') ? target[key] : template[key];
        }
    }
    
    return result;
}

function run() {
    const locales = ['hi', 'kn', 'mr', 'ta', 'te'];
    const en = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));
    
    locales.forEach(loc => {
        const filePath = path.join(LOCALES_DIR, `${loc}.json`);
        if (!fs.existsSync(filePath)) return;
        
        console.log(`Rebasing ${loc}.json...`);
        const target = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const rebased = rebase(en, target);
        
        // Preserve any keys that were in target but not in EN, just in case (optional)
        // For now, we follow the EN structure strictly for parity.
        
        fs.writeFileSync(filePath, JSON.stringify(rebased, null, 4), 'utf8');
        console.log(`  Done.`);
    });
}

run();
