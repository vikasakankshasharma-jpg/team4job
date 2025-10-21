
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const data = await req.json();
  console.log("Received Cashfree webhook data:", data);
  // In a real application, you would add logic here to process the webhook data,
  // for example, updating your database based on the payment status.
  return NextResponse.json({ status: "received" });
}
