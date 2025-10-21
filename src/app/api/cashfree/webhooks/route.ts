
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const data = await req.json();

  console.log('Received Cashfree webhook:', data);

  // Here you would add your logic to handle the webhook event.
  // For example, you could update your database based on the event type.

  return NextResponse.json({ status: 'success' });
}
