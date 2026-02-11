import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { moderateMessageFlow } from '../src/ai/flows/moderate-message';

async function testModeration() {
    console.log("Starting Moderation Test...");

    const testCases = [
        { msg: "Hello, when can you start?", expected: false, desc: "Safe Message" },
        { msg: "Call me at 9876543210 please", expected: true, desc: "Phone Number" },
        { msg: "Pay me at user@upi", expected: true, desc: "UPI ID" },
        { msg: "Email me at test@example.com", expected: true, desc: "Email Address" },
        { msg: "Let's chat on WhatsApp", expected: true, desc: "WhatsApp keyword" }
    ];

    for (const test of testCases) {
        try {
            console.log(`\nTesting: "${test.desc}"`);
            const result = await moderateMessageFlow({ message: test.msg });

            const passed = result.isFlagged === test.expected;
            console.log(`[${passed ? 'PASS' : 'FAIL'}] Input: "${test.msg}"`);
            console.log(`Result: Flagged=${result.isFlagged}, Reason=${result.reason || 'None'}`);
        } catch (error) {
            console.error(`[ERROR] Test "${test.desc}" failed with error:`, error);
        }
    }
}

// simple shim if run directly
testModeration().then(() => console.log("\nDone."));
