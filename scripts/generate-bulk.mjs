import { Stitch, StitchToolClient } from '@google/stitch-sdk';
import fs from 'fs';

const pages = [
  {
    name: "Job Create",
    outPath: "src/components/dashboard/stitch-post-job.tsx",
    componentName: "StitchPostJobClient",
    prompt: "A modern, clean 'Post a Job' wizard for a web application called Team4Job. The platform is for technical installations. Design a beautiful UI with support for BOTH 'Dark Mode' and 'Light Mode' natively using Tailwind CSS dark: classes (ie. bg-white dark:bg-slate-900). Include: A multi-step progress indicator at the top (1. Basic Info, 2. Technical Scope, 3. Budget, 4. Review). Form fields for Job Title, Location, Device Count, and advanced technical requirements. A map placeholder for the job site. Modern interactive elements like toggles for 'Urgent Priority' and 'Requires Master Certification'."
  },
  {
    name: "Professional Job Board",
    outPath: "src/components/dashboard/stitch-job-board.tsx",
    componentName: "StitchProfessionalJobBoard",
    prompt: "A modern, clean 'Job Search & Bidding Board' for technical freelancers on Team4Job. Design a beautiful UI with support for BOTH 'Dark Mode' and 'Light Mode' natively using Tailwind CSS dark: classes. Include: A split layout: Left side is a scrollable list of available technical installation jobs. Right side is a detailed view of the selected job. Advanced filter bars for 'Radius', 'Certifications Required', and 'Budget Range'. The Job Detail view should include a prominent 'Submit Bid' form with price estimation sliders. Incorporate industrial and technical color themes (blues and safety orange)."
  },
  {
    name: "Admin Analytics",
    outPath: "src/components/dashboard/stitch-admin-analytics.tsx",
    componentName: "StitchAdminAnalytics",
    prompt: "A modern, clean 'Platform Admin Analytics' dashboard for Team4Job. Design a beautiful UI with support for BOTH 'Dark Mode' and 'Light Mode' natively using Tailwind CSS dark: classes. Include: Complex data visualizations, large charts, and heatmaps showing platform growth, escrow volume, and active geographical hubs. A data table for 'Pending Professional Verifications' (Name, Certs, Action Buttons to Approve/Reject). A feed of 'Recent Disputes' requiring Admin attention. Dense, technical aesthetic suited for a powerful super-admin."
  }
];

function convertToReact(html, outPath, componentName) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : html;

    bodyContent = bodyContent.replace(/class="/g, 'className="');
    bodyContent = bodyContent.replace(/style="font-variation-settings:\s*'([^']+)'\s*(\d+);?"/g, "style={{ fontVariationSettings: \"'$1' $2\" }}");
    bodyContent = bodyContent.replace(/<img(.*?)\/?>/g, (match, attrs) => "<img" + attrs + " />");
    bodyContent = bodyContent.replace(/<input(.*?)\/?>/g, (match, attrs) => "<input" + attrs + " />");
    bodyContent = bodyContent.replace(/<hr(.*?)\/?>/g, (match, attrs) => "<hr" + attrs + " />");
    bodyContent = bodyContent.replace(/<br(.*?)\/?>/g, (match, attrs) => "<br" + attrs + " />");

    const reactComponent = "'use client';\n" +
"import React from 'react';\n\n" +
"// STITCH GENERATED COMPONENT: " + componentName + "\n" +
"// Note: Requires globals.css and stitch-colors.css\n" +
"export function " + componentName + "() {\n" +
"  return (\n" +
"    <div className=\"font-sans selection:bg-blue-500 selection:text-white\">\n" +
"        " + bodyContent + "\n" +
"    </div>\n" +
"  );\n" +
"}\n\n" +
"export default " + componentName + ";\n";

    fs.writeFileSync(outPath, reactComponent);
    console.log("✅ Saved React Component -> " + outPath);
}

async function runBulk() {
    const STITCH_API_KEY = process.env.STITCH_API_KEY;
    const client = new StitchToolClient({ apiKey: STITCH_API_KEY });
    
    try {
        await client.connect();
        const stitch = new Stitch(client);
        console.log("Creating Bulk Project...");
        const project = await stitch.createProject('Team4Job Bulk Redesign');

        for (const page of pages) {
             console.log("\\n🚀 Generating [" + page.name + "]...");
             try {
                const result = await client.callTool("generate_screen_from_text", {
                    projectId: project.id,
                    deviceType: "AGNOSTIC",
                    prompt: page.prompt
                });
                
                let htmlUrl = null;
                if (result && result.outputComponents) {
                    for (const comp of result.outputComponents) {
                        if (comp.design && comp.design.screens && comp.design.screens.length > 0) {
                            htmlUrl = comp.design.screens[0].htmlCode?.downloadUrl;
                            break;
                        }
                    }
                }
                
                if (!htmlUrl) {
                    throw new Error("No download URL found in the screen generation response!");
                }
                
                console.log("📥 Downloading HTML for " + page.name + "... ");
                const htmlRes = await fetch(htmlUrl);
                const htmlStr = await htmlRes.text();
                
                console.log("⚙️ Converting " + page.name + " to React...");
                convertToReact(htmlStr, page.outPath, page.componentName);
             } catch(err) {
                 console.error("❌ Error on " + page.name + ":", err.message || err);
             }
        }
    } finally {
        await client.close();
    }
}

runBulk();
