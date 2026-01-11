"use client";

import React from "react";
import CookieConsent from "react-cookie-consent";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CookieBanner() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <CookieConsent
            location="bottom"
            buttonText="Accept All"
            declineButtonText="Essential Only"
            enableDeclineButton
            cookieName="dodo-cookie-consent"
            style={{
                background: isDark ? "#1e293b" : "#f1f5f9", // slate-800 : slate-100
                color: isDark ? "#f8fafc" : "#0f172a", // slate-50 : slate-900
                borderTop: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                alignItems: "center",
                zIndex: 999
            }}
            buttonStyle={{
                background: "#0f172a", // slate-900 (primary)
                color: "white",
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "4px",
                fontWeight: "500"
            }}
            declineButtonStyle={{
                background: "transparent",
                color: isDark ? "#94a3b8" : "#64748b",
                fontSize: "13px",
                padding: "8px 16px",
                border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                borderRadius: "4px",
                fontWeight: "500"
            }}
            expires={150}
        >
            <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm">We value your privacy</span>
                <span className="text-xs opacity-90">
                    We use cookies to enhance your experience, analyze site traffic, and assist in our marketing efforts.
                    By clicking &quot;Accept All&quot;, you consent to our use of cookies.
                    <Link href="/privacy" className="underline ml-1 hover:text-primary">
                        Read our Privacy Policy
                    </Link>
                </span>
            </div>
        </CookieConsent>
    );
}
