"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ 
        background: '#0f172a', 
        color: '#fff', 
        display: 'flex', 
        minHeight: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column', 
        fontFamily: 'sans-serif', 
        textAlign: 'center', 
        padding: '2rem' 
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Team4Job — Something went very wrong
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
          Our team has been alerted. Please refresh or return to the homepage.
        </p>
        <a href="/" style={{ 
          background: '#3b82f6', 
          color: '#fff', 
          padding: '0.75rem 2rem',
          borderRadius: '8px', 
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          Return to Team4Job
        </a>
      </body>
    </html>
  );
}
