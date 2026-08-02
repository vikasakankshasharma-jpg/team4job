"use client";

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getCookieConsentValue } from "react-cookie-consent";
import { GA_TRACKING_ID, ANALYTICS_DISABLED } from '@/lib/analytics';

export function AnalyticsInjector() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check initial status
    const checkConsent = () => {
      if (getCookieConsentValue('dodo-cookie-consent') === 'true') {
        setHasConsent(true);
      }
    };
    
    checkConsent();

    // Listen for the event fired by our cookie banner when "Accept All" is clicked
    window.addEventListener('analytics_consent_given', checkConsent);
    return () => window.removeEventListener('analytics_consent_given', checkConsent);
  }, []);

  // If globally disabled (e.g. CI/CD, Emulators, explicit flag), do not render at all
  if (ANALYTICS_DISABLED) return null;

  // Wait until user consents
  if (!hasConsent) return null;

  const hasGa = !!GA_TRACKING_ID;

  return (
    <>
      {hasGa && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            strategy="lazyOnload"
            async
          />
          <Script id="google-analytics" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
