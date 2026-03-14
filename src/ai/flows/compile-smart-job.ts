
import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionAnswerSchema = z.record(z.string(), z.any());

const CompileSmartJobInputSchema = z.object({
    category: z.string().describe('The primary category of the job (e.g., Security & Surveillance, Networking & IT).'),
    answers: QuestionAnswerSchema.describe('Key-value pairs of the fixed question IDs and user selected values.'),
    userEdit: z.string().optional().describe('Text input from the user describing changes or refinements.'),
    currentJobDescription: z.string().optional().describe('The current job description text, if refining.'),
});

export type CompileSmartJobInput = z.infer<typeof CompileSmartJobInputSchema>;

const CompileSmartJobOutputSchema = z.object({
    jobTitle: z.string().describe('A concise and professional job title.'),
    jobDescription: z.string().describe('A clear, installer-friendly job description in bullet points.'),
    conflictWarning: z.string().optional().describe('A warning message if the user edit contradicts the fixed answers.'),
    priceEstimate: z.object({
        min: z.number(),
        max: z.number(),
        currency: z.string(),
    }).optional().describe('Estimated price range for the job based on requirements.'),
    originalText: z.string().optional().describe('The exact original user input text.'),
    detectedLanguage: z.enum(['en', 'hi', 'hinglish']).optional().describe('Detected language of user input.'),
    skills: z.array(z.string()).describe('Suggested technical skills for the job.'),
});

export type CompileSmartJobOutput = z.infer<typeof CompileSmartJobOutputSchema>;

export async function compileSmartJob(input: CompileSmartJobInput): Promise<CompileSmartJobOutput> {
    return compileSmartJobFlow(input);
}

const compileSmartJobPrompt = ai.definePrompt({
    name: 'compileSmartJobPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: CompileSmartJobInputSchema },
    output: { schema: CompileSmartJobOutputSchema },
    prompt: `
  You are an expert job compiler for an Indian service marketplace.
  Convert structured requirements and user input into a professional, clear job posting for the category: "{{category}}".

  Role:
  - You are a COMPILER, not a creative writer.
  - Use simple, direct, installer-friendly language (English).
  - Do not hallucinate details.
  - Preserve user intent exactly.

  Inputs:
  - Answers (Fixed Data): {{json answers}}
  {{#if userEdit}}
  - User Edit: "{{userEdit}}"
  - Current Description: "{{currentJobDescription}}"
  {{/if}}

  Instructions:
  1. **Conflict Guard**:
     - If 'userEdit' is provided, compare it against 'answers'.
     - If the edit contradicts a fixed answer, return a 'conflictWarning' and do NOT update the description.
     - Example: If Answer says "Home" and Edit says "Actually for a massive warehouse", warn the user.

  2. **Generate Title**:
     - Create a professional title: "{{category}} - [Sub Type / Key Service] ([Count/Scope])"
     - Example: "Security & Surveillance - CCTV Setup (4 Points)" or "Networking & IT - LAN Cabling (10 Points)"

  3. **Generate Description**:
     - Use bullet points.
     - Summarize all 'answers' clearly.
     - Incorporate valid 'userEdit' refinements.
     - Language: English.

  4. **Estimate Price**:
     - Provide a market-accurate INR estimate based on category and scope.
     - For Security Systems: ~3k-5k per device.
     - For Networking: ~1k-2k per point + hardware.
     - For Electrical: ~500-2k per point/appliance.

  5. **Skills**:
     - List 5-7 technical skills relevant to the "{{category}}".

  Output JSON format.
  `,
});

/**
 * Local Deterministic Compiler ($0)
 */
function localCompileSmartJob(input: CompileSmartJobInput): CompileSmartJobOutput {
    const { category, answers } = input;
    
    // Extract sub_type for better title if available
    const subType = answers['sub_type'] ? String(answers['sub_type']).toUpperCase() : '';
    
    // Default Title
    const jobTitle = subType ? `${category} - ${subType} Service` : `${category} - Service Requirement`;
    
    // Default Description
    const lines = Object.entries(answers).map(([key, val]) => {
        if (key === 'sub_type') return null; // Skip router question from description
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${label}: ${val}`;
    }).filter(Boolean);
    const jobDescription = lines.map(l => `- ${l}`).join('\n');

    // Default Skills
    let skills = ['General Repairs', 'Installation'];
    const catLower = category.toLowerCase();
    
    if (catLower.includes('security') || catLower.includes('surveillance')) {
        skills = ['System Installation', 'Security Systems', 'Wiring', 'Configuration'];
    } else if (catLower.includes('networking')) {
        skills = ['WiFi Setup', 'LAN Cabling', 'Network Configuration', 'Patching'];
    } else if (catLower.includes('electrical')) {
        skills = ['Electrical Wiring', 'Switchboard Repair', 'Power Troubleshooting'];
    } else if (catLower.includes('plumbing')) {
        skills = ['Pipe Fixing', 'Leak Repair', 'Tank Installation', 'General Plumbing'];
    } else if (catLower.includes('carpentry')) {
        skills = ['Woodwork', 'Furniture Assembly', 'Door & Window Fitting', 'Polishing'];
    }

    return {
        jobTitle,
        jobDescription,
        skills,
        originalText: input.userEdit || "Generated via template",
        detectedLanguage: 'en'
    };
}

const compileSmartJobFlow = defineLoggedFlow(
    {
        name: 'compileSmartJobFlow',
        inputSchema: CompileSmartJobInputSchema,
        outputSchema: CompileSmartJobOutputSchema,
    },
    async (input: z.infer<typeof CompileSmartJobInputSchema>) => {
        if (!input.userEdit || input.userEdit.trim().length === 0) {
            return localCompileSmartJob(input);
        }
        const { output } = await compileSmartJobPrompt(input);
        return output!;
    }
);
