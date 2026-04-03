import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'hi', 'mr', 'ta', 'te', 'kn'];
const defaultLocale = 'en';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the pathname starts with a supported locale
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasLocale) {
        // Extract the locale and the remaining path
        const segments = pathname.split('/');
        const locale = segments[1];
        const newPathname = pathname.replace(`/${locale}`, '') || '/';

        // Redirect to the path without locale, but set the cookie
        const response = NextResponse.redirect(new URL(newPathname, request.url));
        response.cookies.set('NEXT_LOCALE', locale, {
            path: '/',
            maxAge: 365 * 24 * 60 * 60, // 1 year
        });
        return response;
    }

    // Standard behavior for non-localized paths
    return NextResponse.next();
}

export const config = {
    // Only run middleware on pages, not on API routes or static assets
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js).*)'],
};
