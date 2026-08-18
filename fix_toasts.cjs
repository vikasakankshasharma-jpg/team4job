const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Remove .catch(() => { }) and .catch(() => {}) from waitForToast calls
            // Example: waitForToast('Message', 10000).catch(() => { }) -> waitForToast('Message', 10000)
            const catchRegex = /(\.waitForToast\([^)]+\))\s*\.catch\(\s*\(\)\s*=>\s*\{\s*\}?\s*\)/g;
            if (catchRegex.test(content)) {
                content = content.replace(catchRegex, '$1');
                modified = true;
            }

            // Also remove catch(() => null)
            const catchNullRegex = /(\.waitForToast\([^)]+\))\s*\.catch\(\s*\(\)\s*=>\s*null\s*\)/g;
            if (catchNullRegex.test(content)) {
                content = content.replace(catchNullRegex, '$1');
                modified = true;
            }

            // Remove hardcoded timeouts like , 10000) from waitForToast
            // Example: waitForToast('Message', 10000) -> waitForToast('Message')
            const timeoutRegex = /(\.waitForToast\([^,]+),\s*\d+\s*\)/g;
            if (timeoutRegex.test(content)) {
                content = content.replace(timeoutRegex, '$1)');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    });
}

processDir(path.join(__dirname, 'tests'));
