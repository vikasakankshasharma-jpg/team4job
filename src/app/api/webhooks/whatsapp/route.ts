import { NextRequest, NextResponse } from "next/server";

// Verify Webhook (Handshake)
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse("Forbidden", { status: 403 });
        }
    }

    return new NextResponse("Bad Request", { status: 400 });
}

// Receive Messages
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log incoming message (Future: Save to DB)
        console.log("Incoming WhatsApp:", JSON.stringify(body, null, 2));

        // Logic to handle incoming messages would go here
        // e.g., if (body.entry[0].changes[0].value.messages) ...

        return new NextResponse("OK", { status: 200 });
    } catch (error) {
        return new NextResponse("Error", { status: 500 });
    }
}
