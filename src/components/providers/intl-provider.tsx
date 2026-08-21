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
        const loadLocale = async () => {
            // Read locale from cookie (set by LanguageToggle)
            const cookieLocale = Cookies.get('NEXT_LOCALE') as Locale | undefined;
            const validLocale = cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)
                ? cookieLocale
                : 'en';

            try {
                // Dynamically import the translation file
                const langModule = await import(`@/i18n/locales/${validLocale}.json`);
                setLocale(validLocale);
                setMessages(langModule.default);
            } catch (error) {
                // Fallback to English if locale load fails
                const langModule = await import('@/i18n/locales/en.json');
                setLocale('en');
                setMessages(langModule.default);
            }
        };
        
        loadLocale();
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
