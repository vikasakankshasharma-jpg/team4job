
import { config } from 'dotenv';
config({ path: '.env.local' });
import { ai } from './genkit';

async function main() {
    console.log("Testing specific available models...");

    try {
        const result = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: 'Hello',
        });
        console.log("Success with gemini-2.0-flash:", result.text);
    } catch (e) {
        console.error("Failed with gemini-2.0-flash:", e.message);
    }

    try {
        const result = await ai.generate({
            model: 'googleai/gemini-flash-latest',
            prompt: 'Hello',
        });
        console.log("Success with gemini-flash-latest:", result.text);
    } catch (e) {
        console.error("Failed with gemini-flash-latest:", e.message);
    }
}

main();
