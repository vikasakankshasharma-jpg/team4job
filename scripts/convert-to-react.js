const fs = require('fs');

let html = fs.readFileSync('generated-dashboard.html', 'utf8');

// 1. Extract the body content
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
    console.error("No body tag found");
    process.exit(1);
}
let bodyContent = bodyMatch[1];

// 2. Convert class= to className=
bodyContent = bodyContent.replace(/class="/g, 'className="');

// 3. Convert inline styles
bodyContent = bodyContent.replace(/style="font-variation-settings:\s*'([^']+)'\s*(\d+);?"/g, "style={{ fontVariationSettings: \"'$1' $2\" }}");

// 4. Convert self-closing tags
bodyContent = bodyContent.replace(/<img(.*?)>/g, (match, attrs) => {
    if (attrs.endsWith('/')) return match;
    return `<img${attrs} />`;
});
bodyContent = bodyContent.replace(/<input(.*?)>/g, (match, attrs) => {
    if (attrs.endsWith('/')) return match;
    return `<input${attrs} />`;
});
bodyContent = bodyContent.replace(/<hr(.*?)>/g, (match, attrs) => {
    if (attrs.endsWith('/')) return match;
    return `<hr${attrs} />`;
});
bodyContent = bodyContent.replace(/<br(.*?)>/g, (match, attrs) => {
    if (attrs.endsWith('/')) return match;
    return `<br${attrs} />`;
});

// 5. Wrap in a React component
const reactComponent = `
'use client';
import React from 'react';

// STITCH GENERATED FREELANCER DASHBOARD
export function StitchCustomerDashboardClient() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        ${bodyContent}
    </div>
  );
}

export default StitchCustomerDashboardClient;
`;

fs.writeFileSync('src/components/dashboard/stitch-dashboard-client.tsx', reactComponent);
console.log("Written to src/components/dashboard/stitch-dashboard-client.tsx");

// 6. Extract colors
const colorsMatch = html.match(/"colors":\s*({[^}]+})/);
if (colorsMatch) {
    try {
        const colors = JSON.parse(colorsMatch[1]);
        let cssVars = ":root {\n";
        for (const [key, value] of Object.entries(colors)) {
            cssVars += "  --stitch-" + key + ": " + value + ";\n";
        }
        cssVars += "}\n";
        fs.writeFileSync('src/app/stitch-colors.css', cssVars);
        console.log("Written stitch colors to src/app/stitch-colors.css");
    } catch(e) {}
}
