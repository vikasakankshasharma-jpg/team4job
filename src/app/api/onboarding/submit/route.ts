import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { userService } from "@/domains/users/user.service";
import { ProfessionalOnboardingInput } from "@/lib/types";

const limiter = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 1000,
});

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        const userId = decodedToken.uid;

        // Rate Limiting
        try {
            await limiter.check(3, userId);
        } catch (e) {
            return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
        }

        const formData = await req.formData();

        // 1. Prepare Data for Service
        const onboardingData: ProfessionalOnboardingInput = {
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            shopName: formData.get("shopName") as string,
            city: formData.get("city") as string,
            pincode: formData.get("pincode") as string,
            experience: formData.get("experience") as string,
            skills: JSON.parse(formData.get("skills") as string || "[]"),
            files: {}
        };

        const fileKeys = ["aadharFront", "aadharBack", "panCard", "policeVerification", "profilePhoto"] as const;
        for (const key of fileKeys) {
            const file = formData.get(key) as File | null;
            if (file && file.size > 0) {
                onboardingData.files[key] = {
                    buffer: Buffer.from(await file.arrayBuffer()),
                    name: file.name,
                    type: file.type
                };
            }
        }

        // 2. Call Domain Service
        await userService.submitProfessionalOnboarding(userId, onboardingData);

        return NextResponse.json({ success: true, message: "Application submitted successfully" });

    } catch (error: any) {
        console.error("[ONBOARDING SUBMIT ERROR]", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
