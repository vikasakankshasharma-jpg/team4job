import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
        FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
        FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
        NEXT_PUBLIC_USE_EMULATOR: process.env.NEXT_PUBLIC_USE_EMULATOR,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PHASE: process.env.NEXT_PHASE,
    });
}
