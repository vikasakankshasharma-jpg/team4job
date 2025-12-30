import { db } from "@/lib/firebase/server-init"; // Correct import for Server Side
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const LIMITS = {
    'ai_chat': 50, // 50 messages per day
    'ai_photo': 10, // 10 photo analyses per day
    'ai_bio': 5,    // 5 profile bio updates per day (strict!)
    'otp_verify': 5 // 5 OTP attempts per day (or per window? Logic uses day. 5 attempts is safe for manual entry).
};

export async function checkRateLimit(userId: string, action: keyof typeof LIMITS): Promise<{ allowed: boolean, reason?: string }> {
    if (!userId) return { allowed: false, reason: "User ID required" };

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitRef = db.collection('rate_limits').doc(`${userId}_${today}`);

    try {
        const docSnap = await limitRef.get();

        if (!docSnap.exists) {
            // First action of the day
            await limitRef.set({
                userId,
                date: today,
                [action]: 1,
                userRole: 'unknown',
                createdAt: FieldValue.serverTimestamp()
            });
            return { allowed: true };
        }

        const data = docSnap.data();
        const currentCount = (data && data[action]) || 0;
        const maxLimit = LIMITS[action];

        if (currentCount >= maxLimit) {
            return {
                allowed: false,
                reason: `Daily limit reached for ${action}. Limit: ${maxLimit}.`
            };
        }

        // Increment
        await limitRef.update({
            [action]: FieldValue.increment(1),
            lastUpdated: FieldValue.serverTimestamp()
        });

        return { allowed: true };

    } catch (error) {
        console.error("Rate limit check failed:", error);
        // Fail open to avoid blocking reliable users on DB hiccups
        return { allowed: true };
    }
}
