import { NextRequest, NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyEmailSchema } from '@/lib/validations/auth';
import { z } from 'zod';


export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const db = getAdminDb();
        const body = await req.json();

        // Validate input
        const validation = verifyEmailSchema.safeParse(body);

        if (!validation.success) {
            const errorMessage = validation.error.errors[0].message;
            return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
        }

        const { email, otp, action } = validation.data;

        if (action === 'send') {
            // Generate 6-digit OTP
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store in Firestore with 10-minute expiry
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + 10);

            const docRef = db.collection('emailVerifyCodes').doc(email.toLowerCase());
            await docRef.set({
                otp: generatedOtp,
                expiresAt: Timestamp.fromDate(expiry),
                createdAt: Timestamp.now()
            });

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
            logger.info('Email verification OTP sent', { email });

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
                return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
            }

            // Success: Clean up
            await docRef.delete();
            logger.info('Email verified successfully', { email });
            return NextResponse.json({ success: true, message: 'Email verified successfully' });
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        logger.error('Email verification failed', { error });
        return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
    }
}
