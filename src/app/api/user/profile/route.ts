import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/infrastructure/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { sendNotification } from "@/lib/notifications";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getUserIdFromSession } from "@/lib/auth-server";

export async function PUT(req: NextRequest) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const db = getAdminDb();
        const auth = getAdminAuth();
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const updates: any = {};
        const securityAlerts: string[] = [];

        // 1. Handle Name Change
        if (data.name && data.name !== userData.name) {
            updates.name = data.name;
        }

        // 2. Handle Address Changes (Residence/Office)
        if (data.addresses) {
            updates.addresses = {
                ...userData.addresses,
                residence: data.addresses.residence || userData.addresses?.residence,
                office: data.addresses.office || userData.addresses?.office,
                verified: userData.addresses?.verified, // Keep verified as-is
            };
            securityAlerts.push("Address details were updated.");
        }

        // 3. Handle Mobile Change (with Cooling Period)
        if (data.mobile && data.mobile !== userData.mobile) {
            const oldMobile = userData.mobile;
            updates.mobile = data.mobile;
            updates.isMobileVerified = false;
            updates.restrictedUntil = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
            
            // Security Notifications
            if (oldMobile) {
                await sendWhatsAppTemplate(oldMobile, "security_alert", ["Mobile Number Change", "Your mobile number is being changed. If this wasn't you, contact support immediately."]);
            }
            await sendWhatsAppTemplate(data.mobile, "security_alert", ["Mobile Number Change", "Your mobile number has been updated. A 48-hour cooling period is active."]);
            securityAlerts.push("Mobile number was changed. 48-hour cooling period applied.");
        }

        // 4. Handle Email Change (with Cooling Period)
        if (data.email && data.email !== userData.email) {
            const oldEmail = userData.email;
            updates.email = data.email;
            updates.isEmailVerified = false;
            updates.restrictedUntil = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));

            // Update Firebase Auth Email
            await auth.updateUser(userId, { email: data.email, emailVerified: false });

            // Security Notifications
            if (oldEmail) {
                await sendNotification(oldEmail, "Security Alert: Email Changed", `Your Team4Job account email is being changed to ${data.email}.`);
            }
            await sendNotification(data.email, "Security Alert: Email Changed", `Your Team4Job account email has been updated. A 48-hour cooling period is active.`);
            securityAlerts.push("Email address was changed. 48-hour cooling period applied.");
        }
        // 5. Handle GSTIN Change
        if (data.gstin !== undefined && data.gstin !== (userData.gstin || "")) {
            updates.gstin = data.gstin;
            securityAlerts.push("GSTIN details were updated.");
        }

        // 5. Apply Updates
        if (Object.keys(updates).length > 0) {
            updates.updatedAt = Timestamp.now();
            await userRef.update(updates);

            // In-App Notification
            if (securityAlerts.length > 0) {
                await db.collection("notifications").add({
                    userId,
                    type: "SECURITY_ALERT",
                    title: "Profile Security Update",
                    message: securityAlerts.join(" "),
                    createdAt: Timestamp.now(),
                    read: false,
                    priority: "high"
                });
            }
        }

        return NextResponse.json({ success: true, message: "Profile updated successfully" });

    } catch (error: any) {
        console.error("Profile Update Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
