import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth-server";
import { userService } from "@/domains/users/user.service";

export async function PUT(req: NextRequest) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        
        // Use domain service to handle updates and security logic
        await userService.updateProfile(userId, data);

        return NextResponse.json({ success: true, message: "Profile updated successfully" });

    } catch (error: any) {
        console.error("Profile Update Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
