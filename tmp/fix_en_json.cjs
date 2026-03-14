const fs = require('fs');
const path = 'c:/Users/hp/Documents/DoDo/src/i18n/locales/en.json';
const content = fs.readFileSync(path, 'utf8').trim();
const newContent = content.substring(0, content.lastIndexOf('}'));
const finalContent = newContent.substring(0, newContent.lastIndexOf('}')) + '    },\n    "analytics": {\n        "title": "Analytics Overview",\n        "description": "Monitor platform growth, user engagement, and financial performance."\n    }\n}';
fs.writeFileSync(path, finalContent, 'utf8');
console.log('Fixed en.json');
