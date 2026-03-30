import fs from 'fs';
import path from 'path';

const dir = 'src/components/dashboard';
const stitchedFiles = [
    'stitch-admin-analytics.tsx',
    'stitch-job-board.tsx',
    'stitch-post-job.tsx'
];

const replacements = [
    [/stroke-width=/g, 'strokeWidth='],
    [/stroke-linecap=/g, 'strokeLinecap='],
    [/stroke-linejoin=/g, 'strokeLinejoin='],
    [/stroke-miterlimit=/g, 'strokeMiterlimit='],
    [/fill-rule=/g, 'fillRule='],
    [/clip-rule=/g, 'clipRule='],
    [/readonly=/g, 'readOnly='],
    [/readonly=""/g, 'readOnly'],
    [/stroke-dasharray=/g, 'strokeDasharray='],
    [/stroke-dashoffset=/g, 'strokeDashoffset='],
    [/stop-color=/g, 'stopColor='],
    [/stop-opacity=/g, 'stopOpacity='],
    [/clip-path=/g, 'clipPath=']
];

for (const file of stitchedFiles) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    
    for (const [regex, replacement] of replacements) {
        newContent = newContent.replace(regex, replacement);
    }
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log("✅ Fixed camelCase attributes in " + file);
    }
}
