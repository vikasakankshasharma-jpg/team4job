
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // E2E Bypass: Return mock results instantly to avoid Genkit/LLM variability in tests
        if (process.env.NEXT_PUBLIC_E2E === 'true') {
            const subType = body.answers?.['sub_type'] ? String(body.answers['sub_type']).toUpperCase() : '';
            return NextResponse.json({
                jobTitle: subType ? `${body.category} - ${subType} Service` : `${body.category} - Service Requirement`,
                jobDescription: "- Requirement 1\n- Requirement 2",
                priceEstimate: { min: 1000, max: 5000, currency: 'INR' },
                skills: ['System Installation', 'Security Systems', 'Wiring'],
                originalText: "E2E Mocked Response",
                detectedLanguage: 'en'
            });
        }

        const { compileSmartJob } = await import('@/ai/flows/compile-smart-job');
        const result = await compileSmartJob(body);
        return NextResponse.json(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('AI Compile Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to compile job' },
            { status: 500 }
        );
    }
}
