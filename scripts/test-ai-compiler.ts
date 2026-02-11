
import { config } from 'dotenv';
import { compileCCTVJob } from '../src/ai/flows/compile-cctv-job';

// Load environment variables
config({ path: '.env.local' });

async function testAICompiler() {
    console.log('--- TEST 1: Initial Compilation ---');
    const initialPayload = {
        answers: {
            location_type: 'Shop',
            camera_count: '3-4',
            camera_area: 'Indoor',
            wiring_status: 'Needed',
            viewing_requirement: 'Mobile',
            urgency: 'Standard'
        }
    };

    try {
        const res1 = await compileCCTVJob(initialPayload);
        console.log('Test 1 Success!');
        console.log('Output:', JSON.stringify(res1, null, 2));

        console.log('\n--- TEST 2: User Edit with Conflict ---');
        // Conflict: Edit asks for "Outdoor" but original answers said "Indoor"
        const editPayload = {
            answers: initialPayload.answers,
            userEdit: 'I need one camera outside on the roof, very high up.',
            currentJobDescription: res1.jobDescription
        };

        const res2 = await compileCCTVJob(editPayload);
        console.log('Test 2 Success!');
        console.log('Output:', JSON.stringify(res2, null, 2));

    } catch (error: any) {
        console.error('Error:', error);
    }
}

// Run the test
testAICompiler();
