
import { compileSmartJob } from '@/ai/flows/compile-smart-job';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await compileSmartJob(body);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('AI Compile Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to compile job' },
            { status: 500 }
        );
    }
}
