
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
    const key = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
        console.error("No API key found in env.");
        return;
    }
    console.log("Using key starting with:", key.substring(0, 8) + "...");

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Error fetching models:", response.status, response.statusText);
            const text = await response.text();
            console.error(text);
            return;
        }
        const data = await response.json();
        console.log("Available Models:");
        (data.models || []).forEach((m: any) => {
            console.log(`- ${m.name} (${m.displayName})`);
            console.log(`  Methods: ${m.supportedGenerationMethods?.join(', ')}`);
        });
    } catch (e) {
        console.error("Network error:", e);
    }
}

main();
