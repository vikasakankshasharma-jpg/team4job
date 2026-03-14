'use client';

import * as React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Cookies from 'js-cookie';

type Locale = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'kn';

const languages = [
    { code: 'en' as Locale, name: 'English', flag: '🇬🇧' },
    { code: 'hi' as Locale, name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr' as Locale, name: 'मराठी', flag: '🇮🇳' },
    { code: 'ta' as Locale, name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te' as Locale, name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'kn' as Locale, name: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

export function LanguageToggle() {
    const [locale, setLocale] = React.useState<Locale>('en');
    const [isPending, setIsPending] = React.useState(false);

    React.useEffect(() => {
        // Get current locale from cookie
        const savedLocale = Cookies.get('NEXT_LOCALE') as Locale;
        if (savedLocale && ['en', 'hi', 'mr', 'ta', 'te', 'kn'].includes(savedLocale)) {
            setLocale(savedLocale);
        }
    }, []);

    const currentLanguage = languages.find((lang) => lang.code === locale);

    const handleLanguageChange = async (newLocale: Locale) => {
        setIsPending(true);

        // Set cookie
        Cookies.set('NEXT_LOCALE', newLocale, {
            expires: 365, // 1 year
            path: '/',
        });

        setLocale(newLocale);

        // Reload to apply new locale
        window.location.reload();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isPending}>
                    <Globe className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">{currentLanguage?.flag} {currentLanguage?.name || 'EN'}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={locale === lang.code ? 'bg-accent' : ''}
                    >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
