import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const locales = ['en', 'hi', 'mr', 'ta', 'te', 'kn'];

const isE2eAllowed = () => {
    const emulatorEnabled =
        (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
        process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') &&
        (process.env.NODE_ENV !== 'production' || process.env.ALLOW_PRODUCTION_EMULATORS === 'true');

    if (emulatorEnabled) return true;
    if (process.env.ALLOW_E2E_SEED === 'true') return true;
    return process.env.NODE_ENV !== 'production';
};

const PUBLIC_PATHS = [
    '/api/auth/session',
    '/api/cashfree/webhook',
    '/api/test-email',
    ...(isE2eAllowed() ? ['/api/e2e'] : []),
];

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. API Logic (Rate Limiting & Auth)
    if (pathname.startsWith('/api')) {
        const ip = request.headers.get('x-forwarded-for') || 'anonymous';
        try {
            if (!isE2eAllowed()) {
                await limiter.check(20, ip + pathname);
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
            return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
        }

        if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
            return NextResponse.next();
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required. Please provide a valid Bearer token.' },
                { status: 401 }
            );
        }
        return NextResponse.next();
    }

    // 2. Localization Logic
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasLocale) {
        const segments = pathname.split('/');
        const locale = segments[1];
        const newPathname = pathname.replace(`/${locale}`, '') || '/';

        const response = NextResponse.redirect(new URL(newPathname, request.url));
        response.cookies.set('NEXT_LOCALE', locale, {
            path: '/',
            maxAge: 365 * 24 * 60 * 60,
        });
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js).*)'],
};
