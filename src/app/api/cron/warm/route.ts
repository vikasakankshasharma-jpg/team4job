import { NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';

// This route is designed to be pinged by Vercel Cron or UptimeRobot
// It initializes Firebase Admin and does a lightweight operation to keep the lambda warm.
export async function GET() {
    try {
        const start = Date.now();
        
        // Lightweight call to keep Firestore connection warm
        const db = getAdminDb();
        await db.collection('_warmup').limit(1).get();
        
        const duration = Date.now() - start;
        
        return NextResponse.json({
            status: 'warm',
            durationMs: duration,
            timestamp: new Date().toISOString()
        }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    }
}
