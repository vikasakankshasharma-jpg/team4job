'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import Cookies from 'js-cookie';

type Messages = Record<string, any>;

const SUPPORTED_LOCALES = ['en', 'hi', 'mr', 'ta', 'te', 'kn'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

interface IntlProviderProps {
    children: ReactNode;
}

import enMessages from '@/i18n/locales/en.json';

export function IntlProvider({ children }: IntlProviderProps) {
    const [messages, setMessages] = useState<Messages | null>(enMessages);
    const [locale, setLocale] = useState<Locale>('en');

    useEffect(() => {
        // Read locale from cookie (set by LanguageToggle)
        const cookieLocale = Cookies.get('NEXT_LOCALE') as Locale | undefined;
        const validLocale = cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)
            ? cookieLocale
            : 'en';

        setLocale(validLocale);

        // Dynamically import the translation file
        import(`@/i18n/locales/${validLocale}.json`)
            .then((module) => {
                setMessages(module.default);
            })
            .catch((error) => {
                console.error(`Failed to load locale ${validLocale}:`, error);
                // Fallback to English
                import('@/i18n/locales/en.json').then((module) => {
                    setMessages(module.default);
                });
            });
    }, []); // Only run once on mount

    // messages are now initialized with enMessages, so we don't need to block rendering
    // if (!messages) {
    //     return <>{children}</>;
    // }

    return (
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
            {children}
        </NextIntlClientProvider>
    );
}
