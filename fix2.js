const fs = require('fs');
let code = fs.readFileSync('src/domains/dealers/dealer-memory.service.ts', 'utf8');
code = code.replace(/totalRevenue: 0,/g, 'totalRevenue: 0, archived: false,');
code = code.replace(/history: \{\n                totalJobs: 0\n            \},/g, 'history: {\n                totalJobs: 0\n            },\n            archived: false,');
fs.writeFileSync('src/domains/dealers/dealer-memory.service.ts', code);
