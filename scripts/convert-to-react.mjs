import fs from 'fs';

let html = fs.readFileSync('generated-dashboard.html', 'utf8');

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let bodyContent = bodyMatch ? bodyMatch[1] : html;

bodyContent = bodyContent.replace(/class="/g, 'className="');
bodyContent = bodyContent.replace(/style="font-variation-settings:\s*'([^']+)'\s*(\d+);?"/g, "style={{ fontVariationSettings: \"'$1' $2\" }}");
bodyContent = bodyContent.replace(/<img(.*?)\/?>/g, (match, attrs) => `<img${attrs} />`);
bodyContent = bodyContent.replace(/<input(.*?)\/?>/g, (match, attrs) => `<input${attrs} />`);
bodyContent = bodyContent.replace(/<hr(.*?)\/?>/g, (match, attrs) => `<hr${attrs} />`);
bodyContent = bodyContent.replace(/<br(.*?)\/?>/g, (match, attrs) => `<br${attrs} />`);

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
