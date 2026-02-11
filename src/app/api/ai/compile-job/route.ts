
import { compileCCTVJob } from '@/ai/flows/compile-cctv-job';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await compileCCTVJob(body);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error compiling CCTV job:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to compile job' },
            { status: 500 }
        );
    }
}
