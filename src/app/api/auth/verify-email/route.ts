import { NextRequest, NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';
import { getAdminDb } from '@/infrastructure/firebase/admin';

import { rateLimit } from '@/lib/rate-limit';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyEmailSchema } from '@/lib/validations/auth';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        console.log('[VerifyEmailAPI] Request received');
        const db = getAdminDb();
        console.log('[VerifyEmailAPI] Got Admin DB');
        const body = await req.json();
        console.log('[VerifyEmailAPI] Body parsed:', JSON.stringify(body));

        // 1. Rate Limiting (Prevent brute-force and email spam)
        const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
        try {
            await limiter.check(5, clientIp); // Limit 5 requests per minute per IP
        } catch (e) {
            return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        // Validate input
        const validation = verifyEmailSchema.safeParse(body);

        if (!validation.success) {
            const errorMessage = validation.error.errors[0].message;
            return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
        }

        const { email, otp, action } = validation.data;

        if (action === 'send') {
            console.log('[VerifyEmailAPI] Generating OTP');
            // Generate 6-digit OTP
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store in Firestore with 10-minute expiry
            console.log('[VerifyEmailAPI] Calculating expiry');
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + 10);

            console.log(`[VerifyEmailAPI] Saving OTP for ${email} to Firestore...`);
            const docRef = db.collection('emailVerifyCodes').doc(email.toLowerCase());
            
            // Promise race to prevent indefinite hang on Firestore call
            const firestorePromise = docRef.set({
                otp: generatedOtp,
                expiresAt: Timestamp.fromDate(expiry),
                createdAt: Timestamp.now()
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firestore operation timed out')), 10000)
            );

            await Promise.race([firestorePromise, timeoutPromise]);
            console.log(`[VerifyEmailAPI] OTP saved successfully in Firestore`);
            console.log(`[VerifyEmailAPI] OTP saved. Initiating email send...`);

            // Send Email via Brevo
            await sendServerEmail(
                email,
                'Your Verification Code - Team4Job',
                `Your verification code is ${generatedOtp}. It will expire in 10 minutes.`,
                `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5;">Verification Code</h2>
                    <p>Enter the following code to verify your email address on Team4Job:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #111;">${generatedOtp}</div>
                    <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                </div>`
            );


            return NextResponse.json({ success: true, message: 'OTP sent successfully' });
        }

        if (action === 'verify') {
            // TS knows otp is present if schema passes, but let's be safe for runtime
            if (!otp) {
                return NextResponse.json({ success: false, message: 'OTP is required' }, { status: 400 });
            }

            const docRef = db.collection('emailVerifyCodes').doc(email.toLowerCase());
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                return NextResponse.json({ success: false, message: 'No verification code found or already expired' }, { status: 404 });
            }

            const data = docSnap.data();
            if (!data) {
                return NextResponse.json({ success: false, message: 'Invalid verification data' }, { status: 400 });
            }

            const now = Timestamp.now();

            if (data.expiresAt.toMillis() < now.toMillis()) {
                await docRef.delete();
                return NextResponse.json({ success: false, message: 'OTP has expired' }, { status: 400 });
            }

            if (data.otp !== otp) {
                // Test Bypass for development/test credentials
                const isTestEmail = email.toLowerCase() === 'test@example.com' || email.toLowerCase().endsWith('@test.com');
                if (otp === '123456' && (isTestEmail || process.env.NODE_ENV !== 'production')) {
                    console.log(`[VerifyEmailAPI] Test bypass triggered for ${email}`);
                } else {
                    return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
                }
            }

            // Success: Clean up
            await docRef.delete();

            return NextResponse.json({ success: true, message: 'Email verified successfully' });
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[VerifyEmailAPI] Critical Error:', error);
        if (error.message?.includes('16 UNAUTHENTICATED')) {
            console.error('[VerifyEmailAPI] Firebase Admin is NOT authenticated. Check DO_FIREBASE_PRIVATE_KEY and DO_FIREBASE_PROJECT_ID.');
        }
        return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
    }
}
