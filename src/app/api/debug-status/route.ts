import { NextResponse } from 'next/server';
import { getAdminApp } from '@/infrastructure/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const app = getAdminApp();
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      projectId: process.env.DO_FIREBASE_PROJECT_ID,
      hasKey: !!process.env.DO_FIREBASE_PRIVATE_KEY,
      keyLength: process.env.DO_FIREBASE_PRIVATE_KEY?.length,
      keyPreview: process.env.DO_FIREBASE_PRIVATE_KEY?.substring(0, 50) + '...',
      environment: process.env.NODE_ENV,
      envKeys: Object.keys(process.env).filter(k => 
        k.startsWith('NEXT_PUBLIC_') || 
        k.startsWith('DO_') || 
        k.startsWith('GEMINI') ||
        k.startsWith('FIREBASE_')
      ),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      stack: error.stack,
      envDump: {
         hasProject: !!process.env.DO_FIREBASE_PROJECT_ID,
         hasEmail: !!process.env.DO_FIREBASE_CLIENT_EMAIL,
         hasKey: !!process.env.DO_FIREBASE_PRIVATE_KEY,
      }
    }, { status: 500 });
  }
}
