import { Stitch, StitchToolClient } from '@google/stitch-sdk';
import fs from 'fs';

async function generate() {
    const STITCH_API_KEY = process.env.STITCH_API_KEY;
    const client = new StitchToolClient({ apiKey: STITCH_API_KEY });
    
    try {
        await client.connect();
        const stitch = new Stitch(client);
        
        console.log("Creating project...");
        const project = await stitch.createProject('Team4Job UI Redesign - Dashboard');
        
        const prompt = `A modern, clean freelancer dashboard for a web application called Team4Job.
The platform is for technical installations. 
Design a beautiful UI with support for BOTH 'Dark Mode' and 'Light Mode' natively using Tailwind CSS dark: classes (ie. bg-white dark:bg-slate-900 text-slate-900 dark:text-white).
Design should be responsive for all screen sizes (Desktop, Tablet, Mobile) using proper container queries or md:, lg: breakpoints.
Design should be easily understandable, readable, highly usable.
Include attractive graphics, charts, bars, and diagrams where required to show active installations, recent earnings, and quick actions.
Make it modern yet simple, fast, and lite to use.
Include:
- A responsive sidebar/top navigation with Dashboard, Jobs, Bids, Wallet
- A main content area with the charts and statistics.`;

        console.log("Generating screen...");
        const res = await client.callTool("generate_screen_from_text", {
            projectId: project.id,
            deviceType: "AGNOSTIC",
            prompt: prompt
        });
        
        fs.writeFileSync('dashboard-response.json', JSON.stringify(res, null, 2));
        console.log("Saved entire response to dashboard-response.json");
        
        // Try to extract the code
        if ((res as any).content && Array.isArray((res as any).content)) {
            for (const item of (res as any).content) {
                if (item.screen && item.screen.docContext && item.screen.docContext.code) {
                    fs.writeFileSync('generated-dashboard.html', item.screen.docContext.code);
                    console.log("Saved generated-dashboard.html!");
                }
            }
        }
    } catch (e) {
        console.error("Error during generation:", e);
    } finally {
        await client.close();
    }
}

generate();
