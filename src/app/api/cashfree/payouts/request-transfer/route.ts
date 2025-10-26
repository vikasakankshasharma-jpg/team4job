
// THIS FILE IS DEPRECATED AND NO LONGER IN USE
// The logic has been moved to the new /api/escrow/release-funds route
// to support the Cashfree Escrow system.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/escrow/release-funds.' 
    },
    { status: 410 } // 410 Gone
  );
}
