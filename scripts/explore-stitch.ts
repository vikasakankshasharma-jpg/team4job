import { Stitch } from '@google/stitch-sdk';

const client = new Stitch({ apiKey: process.env.STITCH_API_KEY });

async function explore() {
    try {
        console.log("Creating project...");
        const project = await client.createProject();
        console.log("Project created:", project.id);
        
        console.log("Project prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(project)));
        
        // guess methods to generate a screen
        if ('createScreen' in project) {
            console.log("Trying to create screen...");
            const screen = await (project as any).createScreen({ prompt: "A modern freelancer dashboard for a web application called Team4Job. Focus on technical installation platform features." });
            console.log("Screen created:", screen.id);
            console.log("Screen prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(screen)));
            console.log("Screen properties:", Object.keys(screen));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

explore();
