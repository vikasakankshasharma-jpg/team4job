
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Only initialize real Genkit in production (not in CI/test mode)
const isCI = process.env.NEXT_PUBLIC_IS_CI === 'true';

export const ai: any = isCI ? {
  // Minimal mock to prevent crashes in CI/test
  definePrompt: () => ({}),
  defineFlow: () => {
    const flow = (input: any) => Promise.resolve({ success: true, data: {} });
    (flow as any).run = flow;
    return flow;
  },
  generate: () => Promise.resolve({ text: () => "Mocked Response" }),
  defineSchema: (name: string, schema: any) => schema,
} : genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
