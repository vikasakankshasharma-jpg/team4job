
// Scripts/test-embedding-with-patch.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Patch fetch
const originalFetch = global.fetch;
global.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Referer', 'https://dodo-beta.web.app/');
    headers.set('Origin', 'https://dodo-beta.web.app');
    return originalFetch(input, { ...init, headers });
};

import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) { console.error("No API Key"); return; }

    const genAI = new GoogleGenerativeAI(key);

    const models = ["text-embedding-004", "embedding-001", "models/text-embedding-004", "models/embedding-001"];

    for (const m of models) {
        try {
            console.log(`Testing ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.embedContent("Hello world");
            console.log(`✅ Success ${m}! Dimensions: ${result.embedding.values.length}`);
            return; // Stop on first success
        } catch (e: any) {
            console.error(`❌ Error ${m}:`, e.message?.substring(0, 100) || e);
        }
    }
}
run();
