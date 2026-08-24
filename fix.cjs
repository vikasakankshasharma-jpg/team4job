const fs = require('fs');
let code = fs.readFileSync('tests/state-machine/dealer-memory.integration.test.ts', 'utf8');
code = code.replace(/'9999999999'/g, 'Date.now().toString()');
code = code.replace(/'8888888888'/g, '(Date.now()+1).toString()');
fs.writeFileSync('tests/state-machine/dealer-memory.integration.test.ts', code);
