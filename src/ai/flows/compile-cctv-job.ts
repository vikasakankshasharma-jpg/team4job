
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionAnswerSchema = z.record(z.string(), z.any());

const CompileCCTVJobInputSchema = z.object({
    answers: QuestionAnswerSchema.describe('Key-value pairs of the fixed question IDs and user selected values.'),
    userEdit: z.string().optional().describe('Text input from the user describing changes or refinements.'),
    currentJobDescription: z.string().optional().describe('The current job description text, if refining.'),
});

export type CompileCCTVJobInput = z.infer<typeof CompileCCTVJobInputSchema>;

const CompileCCTVJobOutputSchema = z.object({
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
});

export type CompileCCTVJobOutput = z.infer<typeof CompileCCTVJobOutputSchema>;

export async function compileCCTVJob(input: CompileCCTVJobInput): Promise<CompileCCTVJobOutput> {
    return compileCCTVJobFlow(input);
}

const compileCCTVJobPrompt = ai.definePrompt({
    name: 'compileCCTVJobPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: CompileCCTVJobInputSchema },
    output: { schema: CompileCCTVJobOutputSchema },
    prompt: `
  You are processing user-provided job content for an Indian job marketplace.
  Your goal is to convert structured requirements into a clear, professional job posting.

  Input may be in:
  - English
  - Hindi (Devanagari script)
  - Hinglish (Hindi written in English/Roman script)

  Role:
  - You are a COMPILER, not a creative writer.
  - Use simple, direct, installer-friendly language (English).
  - Do not hallucinate brand preferences or technical specs unless specified.
  - Preserve user intent exactly.

  Inputs:
  - Answers: {{json answers}}
  {{#if userEdit}}
  - User Edit: "{{userEdit}}"
  - Current Description: "{{currentJobDescription}}"
  {{/if}}

  Instructions:
  1. **Language Detection** (if userEdit provided):
     - Detect if the user input is in English, Hindi (Devanagari), or Hinglish.
     - Store the exact original text in 'originalText'.
     - Set 'detectedLanguage' to 'en', 'hi', or 'hinglish'.

  2. **Analyze Constraints**:
     - Check the 'Answers' (Fixed Questions). These are the source of truth.
     {{#if userEdit}}
     - Check the 'User Edit' for requested changes.
     - **Conflict Guard** logic:
       - Compare 'User Edit' against 'Answers'.
       - If the edit contradicts a fixed answer (e.g., Answer="Indoor", Edit="I want outdoor cameras" or "मुझे बाहर भी कैमरा चाहिए"), you MUST generate a 'conflictWarning'.
       - Example Warning: "You initially selected 'Indoor Only'. Since you need outdoor coverage too, should we switch your requirement to 'Both Indoor & Outdoor'?"
       - Do NOT update the description if a conflict is detected. Return the 'conflictWarning' only.
       - If the edit is a non-conflicting detailed refinement (e.g., "Camera 2 should be near the cash counter" or "दुकान के सामने वाला कैमरा"), accept it and update the description.
     {{/if}}

  3. **Generate Title** (always in English):
     - Format: "CCTV Installation - [Type] ([Count] Cameras)"
     - Example: "CCTV Installation - Shop (3-4 Cameras)"

  4. **Generate Description** (always in English):
     - Use bullet points.
     - Include Location Type, Camera Count, Wiring Status, Viewing Preference, Urgency.
     - Incorporate any valid refinements from 'User Edit'.
     - Never add assumptions or modify user intent.

  5. **Estimate Price**:
     - Provide a rough market rate estimate (in INR) based on the camera count and type.
     - General logic (for estimation only):
       - 1-2 Cameras: ₹5,000 - ₹12,000
       - 3-4 Cameras: ₹15,000 - ₹25,000
       - 5-8 Cameras: ₹30,000 - ₹50,000
       - 8+ Cameras: ₹50,000+
     - Adjust slightly for "New Wiring" vs "Available".

  Output JSON format.
  `,
});

const compileCCTVJobFlow = ai.defineFlow(
    {
        name: 'compileCCTVJobFlow',
        inputSchema: CompileCCTVJobInputSchema,
        outputSchema: CompileCCTVJobOutputSchema,
    },
    async (input) => {
        const { output } = await compileCCTVJobPrompt(input);
        return output!;
    }
);
