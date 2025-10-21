
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Received Cashfree webhook:', data);

    // Process the webhook data here (e.g., update your database)

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
