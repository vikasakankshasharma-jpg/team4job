const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('tests');
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('networkidle')) {
        let newContent = content
            .replace(/waitUntil:\s*'networkidle'/g, "waitUntil: 'domcontentloaded'")
            .replace(/waitForLoadState\('networkidle'/g, "waitForLoadState('domcontentloaded'");
        
        if (newContent !== content) {
            fs.writeFileSync(file, newContent);
            console.log('Fixed', file);
            modifiedCount++;
        }
    }
});

console.log('Finished. Modified', modifiedCount, 'files.');
