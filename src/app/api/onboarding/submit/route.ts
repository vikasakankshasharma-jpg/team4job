import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/server-init";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const formData = await req.formData();
        const db = getAdminDb();
        const storage = getAdminStorage();

        // 1. Extract Data
        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const shopName = formData.get("shopName") as string;
        const city = formData.get("city") as string;
        const pincode = formData.get("pincode") as string;
        const experience = formData.get("experience") as string;
        const skills = JSON.parse(formData.get("skills") as string || "[]");

        // 2. Upload Files
        const files = {
            aadharFront: formData.get("aadharFront") as File | null,
            aadharBack: formData.get("aadharBack") as File | null,
            panCard: formData.get("panCard") as File | null,
            profilePhoto: formData.get("profilePhoto") as File | null,
        };

        const uploadedUrls: Record<string, string> = {};

        for (const [key, file] of Object.entries(files)) {
            if (file && file.size > 0) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const fileName = `kyc/${userId}/${key}_${Date.now()}.${file.name.split('.').pop()}`;
                const bucket = storage.bucket();
                const fileRef = bucket.file(fileName);

                await fileRef.save(buffer, {
                    metadata: { contentType: file.type },
                });

                await fileRef.makePublic(); // Or use signed URLs for better security
                uploadedUrls[key] = fileRef.publicUrl();
            }
        }

        // 3. Update User Profile
        await db.collection("users").doc(userId).update({
            name: `${firstName} ${lastName}`.trim(),
            "address.cityPincode": pincode,
            "address.city": city, // Assuming schema supports this or we map it
            "installerProfile.shopName": shopName, // Add to schema if missing
            "installerProfile.experience": experience,
            "installerProfile.skills": skills,
            "installerProfile.verificationStatus": "pending", // New field
            "installerProfile.documents": uploadedUrls,
            "installerProfile.submittedAt": Timestamp.now(),
            "realAvatarUrl": uploadedUrls.profilePhoto || undefined,
        });

        return NextResponse.json({ success: true, message: "Application submitted successfully" });

    } catch (error: any) {
        console.error("Onboarding submission error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
