import fs from 'fs';

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

// 3. Convert inline styles style="font-variation-settings: 'FILL' 1;" to style={{ fontVariationSettings: "'FILL' 1" }}
// We'll use a regex to fix the common ones in the Stitch output
bodyContent = bodyContent.replace(/style="font-variation-settings:\s*'([^']+)'\s*(\d+);"/g, "style={{ fontVariationSettings: \"'$1' $2\" }}");

// 4. Convert self-closing tags
bodyContent = bodyContent.replace(/<img(.*?)>/g, (match, attrs) => {
    if (attrs.endsWith('/')) return match;
    return `<img${attrs} />`;
});
bodyContent = bodyContent.replace(/<input(.*?)>/g, (match, attrs) => {
    if (attrs.endsWith('/')) return match;
    return `<input${attrs} />`;
});

// 5. Wrap in a React component
const reactComponent = `
'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// NOTE: Ensure to include the Material Symbols font in your layout.tsx or globals.css
// <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

// Stitch Original Colors:
// Add these to your tailwind.config.ts if they are missing
/*
  surface-container: #171f33,
  on-surface: #dae2fd,
  primary: #b4c5ff,
  secondary: #ffb690,
  tertiary: #ffb596,
*/

export function CustomerDashboardClient() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        ${bodyContent}
    </div>
  );
}

export default CustomerDashboardClient;
`;

fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', reactComponent);
console.log("Written to src/app/dashboard/dashboard-client.tsx");

// 6. Extract the colors to a CSS file to append to globals.css
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
