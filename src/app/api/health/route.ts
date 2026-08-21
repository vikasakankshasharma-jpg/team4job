import { NextResponse } from 'next/server';
import { db } from '@/infrastructure/firebase/client';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { logger } from '@/infrastructure/logger';

/**
 * Enhanced health check endpoint for uptime monitoring services.
 * Returns 200 OK to indicate the application server is running and database is reachable.
 */
export async function GET() {
    try {
        // Simple fast query to check if Firebase is reachable
        const q = query(collection(db, 'users'), limit(1));
        await getDocs(q);

        return NextResponse.json(
            {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                firebase: 'connected',
                environment: process.env.NODE_ENV,
            },
            { status: 200 }
        );
    } catch (error) {
        logger.error('Health check failed: Firebase connection error', error);
        
        return NextResponse.json(
            {
                status: 'error',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                firebase: 'disconnected',
                environment: process.env.NODE_ENV,
            },
            { status: 503 }
        );
    }
}
