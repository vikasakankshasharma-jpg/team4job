
// Scripts to check critical environment variables
// Usage: npx tsx scripts/check-env.ts

import * as dotenv from 'dotenv';
import fs from 'fs';

// Load .env.production if it exists, otherwise .env
if (fs.existsSync('.env.production')) {
    dotenv.config({ path: '.env.production' });
    console.log("📄 Loaded .env.production");
} else {
    dotenv.config();
    console.log("📄 Loaded .env");
}

const REQUIRED_KEYS = [
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
];

const missingKeys = REQUIRED_KEYS.filter(key => !process.env[key]);

if (missingKeys.length > 0) {
    console.error("❌ ERROR: Missing required environment variables:");
    missingKeys.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
} else {
    console.log("✅ All required environment variables are present.");
    process.exit(0);
}
