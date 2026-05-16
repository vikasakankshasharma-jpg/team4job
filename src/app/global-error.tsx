"use client";

import * as Sentry from "@sentry/nextjs";
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
        margin: 0,
        backgroundColor: '#020617', // slate-950
        color: '#f8fafc', // slate-50
        display: 'flex', 
        minHeight: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column', 
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        textAlign: 'center', 
        padding: '2rem',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Background Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-6rem',
          right: '-6rem',
          height: '24rem',
          width: '24rem',
          borderRadius: '9999px',
          backgroundColor: 'rgba(239, 68, 68, 0.05)', // destructive/5
          filter: 'blur(64px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-6rem',
          left: '-6rem',
          height: '24rem',
          width: '24rem',
          borderRadius: '9999px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)', // destructive/10
          filter: 'blur(64px)'
        }} />

        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            marginBottom: '2rem',
            display: 'flex',
            height: '7rem',
            width: '7rem',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '1.5rem',
            background: 'linear-gradient(to bottom right, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))',
            boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.2)',
            backdropFilter: 'blur(4px)'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="56" 
              height="56" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ animation: 'bounce 1s infinite' }}
            >
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          
          <h1 style={{ 
            marginBottom: '1rem', 
            fontSize: '2.25rem', 
            fontWeight: 900, 
            letterSpacing: '-0.025em',
            margin: '0 0 1rem 0'
          }}>
            System failure
          </h1>
          
          <p style={{ 
            marginBottom: '2.5rem', 
            maxWidth: '28rem', 
            fontSize: '1.125rem', 
            color: '#94a3b8', // slate-400
            lineHeight: 1.6,
            margin: '0 0 2.5rem 0'
          }}>
            A critical error has occurred in the application core. Our engineering team has been automatically dispatched.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button 
              onClick={() => window.location.reload()}
              style={{ 
                background: 'transparent', 
                color: '#f8fafc', 
                padding: '0.75rem 2rem',
                borderRadius: '8px', 
                border: '1px solid #1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Reload Page
            </button>
            <a href="/" style={{ 
              background: '#ef4444', 
              color: '#fff', 
              padding: '0.75rem 2rem',
              borderRadius: '8px', 
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '1rem',
              boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)'
            }}>
              Emergency Return
            </a>
          </div>

          {error.digest && (
            <div style={{
              marginTop: '3rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '9999px',
              border: '1px solid #1e293b',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              padding: '0.25rem 1rem',
              fontSize: '10px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#94a3b8'
            }}>
              <span style={{ height: '6px', width: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              Error ID: {error.digest}
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes bounce {
            0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
            50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
          }
        ` }} />
      </body>
    </html>
  );
}
