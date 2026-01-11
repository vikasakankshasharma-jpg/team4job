
import { NextRequest, NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';
import { db } from '@/lib/firebase/server-init';
import { collection, doc, setDoc, getDoc, Timestamp, deleteDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { email, otp, action } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
        }

        if (action === 'send') {
            // Generate 6-digit OTP
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store in Firestore with 10-minute expiry
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + 10);

            await setDoc(doc(db, 'emailVerifyCodes', email.toLowerCase()), {
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

            return NextResponse.json({ success: true, message: 'OTP sent successfully' });
        }

        if (action === 'verify') {
            if (!otp) {
                return NextResponse.json({ success: false, message: 'OTP is required' }, { status: 400 });
            }

            const docRef = doc(db, 'emailVerifyCodes', email.toLowerCase());
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return NextResponse.json({ success: false, message: 'No verification code found or already expired' }, { status: 404 });
            }

            const data = docSnap.data();
            const now = Timestamp.now();

            if (data.expiresAt.toMillis() < now.toMillis()) {
                await deleteDoc(docRef);
                return NextResponse.json({ success: false, message: 'OTP has expired' }, { status: 400 });
            }

            if (data.otp !== otp) {
                return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
            }

            // Success: Clean up
            await deleteDoc(docRef);
            return NextResponse.json({ success: true, message: 'Email verified successfully' });
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Email Verification API Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
    }
}
