
// Scripts/seed-knowledge.ts (Run with tsx)
import * as dotenv from 'dotenv';

// 1. Load Environment Variables immediately
dotenv.config({ path: '.env.local' });

// 2. Patch global.fetch BEFORE importing any Genkit/GoogleAI libraries
const originalFetch = global.fetch;
global.fetch = async (input, init) => {
    // console.log("Intercepted fetch:", input); // Debugging
    const headers = new Headers(init?.headers);
    headers.set('Referer', 'https://dodo-beta.web.app/');
    headers.set('Origin', 'https://dodo-beta.web.app');

    // Add User-Agent just in case
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    return originalFetch(input, {
        ...init,
        headers
    });
};

console.log("🔧 Patched fetch with Referer: https://dodo-beta.web.app/");

// 3. Industry-specific seed data for CCTV, Security Surveillance & Access Control
const SEED_DOCS = [
    {
        content: "CCTV installation requires proper camera placement with clear line-of-sight to coverage areas. IP cameras typically cost ₹3,000-₹15,000 per unit depending on resolution (2MP to 8MP). DVR/NVR systems range from ₹8,000-₹50,000 based on channel capacity. Installation labor is usually ₹500-₹1,500 per camera point including cable routing.",
        metadata: { type: 'pricing_guide', category: 'cctv_installation', industry: 'security_surveillance' }
    },
    {
        content: "Access Control System installation for commercial buildings: Biometric systems (fingerprint/face recognition) cost ₹15,000-₹75,000 per door. RFID card-based systems are more economical at ₹8,000-₹25,000 per access point. Typical office setup with 3-5 entry points takes 2-3 days for complete installation and configuration.",
        metadata: { type: 'pricing_guide', category: 'access_control', industry: 'security_systems' }
    },
    {
        content: "Security surveillance best practices: Minimum 30 days of footage retention required for commercial properties. Night vision cameras essential for 24/7 monitoring. Camera resolution should be at least 2MP (1080p) for face recognition. Installers must provide warranty of minimum 1 year on equipment and 6 months on installation work.",
        metadata: { type: 'best_practice', category: 'surveillance_standards', industry: 'security_surveillance' }
    },
    {
        content: "CCTV camera types and applications: Dome cameras for indoor retail (₹3,500-₹8,000), Bullet cameras for outdoor perimeter security (₹4,000-₹12,000), PTZ cameras for large area monitoring (₹25,000-₹1,50,000). Installers should recommend based on coverage area, lighting conditions, and client budget.",
        metadata: { type: 'technical_guide', category: 'equipment_selection', industry: 'cctv' }
    },
    {
        content: "Common installation scope for residential CCTV: 4-camera setup with 1TB DVR costs ₹25,000-₹40,000 including installation. 8-camera commercial setup with 2TB NVR ranges ₹50,000-₹85,000. Additional costs: CAT6 cable ₹20/meter, power supply ₹500-₹1,500, mounting brackets ₹200-₹500 per camera.",
        metadata: { type: 'pricing_guide', category: 'package_pricing', industry: 'cctv_installation' }
    },
    {
        content: "Service and maintenance: Annual Maintenance Contract (AMC) for CCTV systems typically 10-15% of installation cost. Includes quarterly preventive maintenance, cleaning, firmware updates, and priority support. Access control systems require monthly testing and 6-month battery replacement for backup power.",
        metadata: { type: 'service_policy', category: 'maintenance', industry: 'security_systems' }
    }
];

async function main() {
    console.log("🌱 Seeding Knowledge Base...");

    // 4. Dynamic Import of Service (AFTER patch)
    const { aiKnowledgeService } = await import('../src/ai/services/AIKnowledgeService');
    const { getAdminDb } = await import('../src/lib/firebase/server-init');

    try {
        for (const doc of SEED_DOCS) {
            console.log(`Indexing: ${doc.content.substring(0, 30)}...`);
            const id = await aiKnowledgeService.indexDocument(doc.content, doc.metadata);
            console.log(`✅ Indexed ID: ${id}`);
        }
        console.log("🎉 Seeding Complete!");

        // Verification Search
        console.log("\n🔍 Verifying Search: 'How much for painting?'");
        const results = await aiKnowledgeService.searchSimilar("How much for painting?", 1);
        console.log("Top Result:", results[0]?.content);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
}

main();
