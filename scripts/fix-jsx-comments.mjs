import fs from 'fs';
import path from 'path';

const dir = 'src/components/dashboard';
const stitchedFiles = [
    'stitch-dashboard-client.tsx',
    'stitch-post-job.tsx',
    'stitch-job-board.tsx',
    'stitch-admin-analytics.tsx'
];

for (const file of stitchedFiles) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
        console.log("⚠️ Not found: " + filePath);
        continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}");
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log("✅ Fixed JSX comments in " + file);
    } else {
        console.log("✨ No comments to fix in " + file);
    }
}
