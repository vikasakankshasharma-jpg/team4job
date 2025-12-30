
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that do not require authentication (public APIs)
// Add '/api/test' or similar if needed for health checks
const PUBLIC_PATHS = [
    '/api/auth/session', // If using next-auth or similar, adjust as needed. 
    // We might want '/api/jobs/public' to be accessible, BUT it should still ideally require an auth token 
    // if we want to rate limit or track. 
    // However, the original analysis said: "Refactor /api/jobs/public ... to use the authenticated User ID". 
    // So let's enforcing Auth for everything for now to be safe, except maybe strictly public webhooks.
    '/api/cashfree/webhook', // Webhooks usually use signature verification, not Bearer tokens
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only strictly secure /api routes
    if (!pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Skip public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Return JSON error for API routes
        return NextResponse.json(
            { error: 'Authentication required. Please provide a valid Bearer token.' },
            { status: 401 }
        );
    }

    // Note: We cannot verify the Firebase ID Token fully in Edge Middleware because 
    // creating a Firebase Admin instance in Edge is tricky/limited. 
    // Strategy: We check for presence here, and rely on the actual Route Handler 
    // to do the heavy `adminAuth.verifyIdToken(token)`. 
    // OR we forward the token.
    // Ideally, we just enforce *presence* here to strip out low-effort attacks.
    // The Route Handlers (Refactoring Step) will do the cryptographic verification.

    const response = NextResponse.next();

    // You can set custom headers here if needed for downstream
    // response.headers.set('x-auth-present', 'true');

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
