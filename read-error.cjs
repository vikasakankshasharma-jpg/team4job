const fs = require('fs');
const html = fs.readFileSync('smoke-logs-new/playwright-report/index.html', 'utf8');
const match = html.match(/"message":"([^"]+)"/g);
if (match) {
    console.log(match.slice(0, 5).join('\n'));
} else {
    console.log("No error messages found.");
}
