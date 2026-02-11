
// Scripts to test CCTV Voice Analysis (Mock)
// Usage: npx tsx scripts/test-cctv-voice.ts

const MOCK_TRANSCRIPT = "I need 4 night vision cameras for my grocery store godown. Also need wiring and installation. Budget is around 12000.";

// Expected Output Schema
interface CCTVJobOutput {
    title: string;
    description: string;
    skills: string[];
    category: string;
}

async function runMockTest() {
    console.log("🎤 Testing CCTV Voice Analysis...");
    console.log(`📝 Input Transcript: "${MOCK_TRANSCRIPT}"`);

    // Simulate AI Processing (Mocking the process-cctv-voice.ts output)
    const result: CCTVJobOutput = {
        title: "4 Night Vision Cameras for Grocery Store Godown",
        description: `Installation of 4 Night Vision Cameras for a grocery store godown.\nIncludes wiring and installation.\nClient mentioned budget around 12000.`,
        skills: ["CCTV", "Night Vision", "Wiring", "Installation"],
        category: "Security & CCTV"
    };

    console.log("\n🤖 AI Output (Simulated):");
    console.log(JSON.stringify(result, null, 2));

    // Validation
    const errors: string[] = [];
    if (!result.title.includes("Night Vision")) errors.push("Title missing key equipment.");
    if (!result.skills.includes("Wiring")) errors.push("Skills missing 'Wiring'.");
    if (result.category !== "Security & CCTV") errors.push("Wrong category.");

    if (errors.length > 0) {
        console.error("❌ Validation Failed:", errors);
        process.exit(1);
    } else {
        console.log("\n✅ Verification Passed!");
    }
}

runMockTest();
