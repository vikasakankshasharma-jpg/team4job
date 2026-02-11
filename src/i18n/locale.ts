import { cookies } from 'next/headers';

// Supported locales
export const locales = ['en', 'hi', 'mr', 'ta', 'te', 'kn'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Get user's preferred locale from cookies or browser
export async function getUserLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');

    if (localeCookie && isValidLocale(localeCookie.value)) {
        return localeCookie.value as Locale;
    }

    return defaultLocale;
}

// Set user's preferred locale in cookies
export async function setUserLocale(locale: Locale) {
    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
    });
}

function isValidLocale(locale: string): locale is Locale {
    return locales.includes(locale as Locale);
}
