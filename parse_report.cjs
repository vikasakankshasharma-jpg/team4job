const fs = require('fs');
const [,, reportPath] = process.argv;
const html = fs.readFileSync(`${reportPath}/playwright-report/index.html`, 'utf8');
const failed = html.match(/"title":"[^"]+","ok":false/g);
console.log(failed ? failed.slice(0, 10) : 'No failed tests found in ' + reportPath);
