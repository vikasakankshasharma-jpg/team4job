
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API Key found");
        return;
    }
    console.log("Using Key:", key.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(key);

    // Try text-embedding-004
    try {
        console.log("Testing text-embedding-004...");
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent("Hello world");
        console.log("Success text-embedding-004!", result.embedding.values.slice(0, 5));
        return;
    } catch (e: any) {
        console.error("Error text-embedding-004:", e.message || e);
    }

    // Try embedding-001
    try {
        console.log("Testing embedding-001...");
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent("Hello world");
        console.log("Success embedding-001!", result.embedding.values.slice(0, 5));
    } catch (e: any) {
        console.error("Error embedding-001:", e.message || e);
    }
}
run();
