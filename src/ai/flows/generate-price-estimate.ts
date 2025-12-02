
import { airo, globalFlow, z } from "@genkit-ai/airov2";

// Define the input schema for the price estimate flow
const PriceEstimateInputSchema = z.object({
  jobTitle: z.string().describe("The title of the job (e.g., 'Install 4 new CCTV cameras')"),
  jobDescription: z.string().describe("A detailed description of the job requirements."),
  skills: z.array(z.string()).describe("A list of required skills (e.g., ['ip cameras', 'cabling'])"),
  pincode: z.string().describe("The 6-digit pincode for the job location."),
});

// Define the output schema for the price estimate flow
const PriceEstimateOutputSchema = z.object({
  min: z.number().describe("The estimated minimum reasonable price for the job in INR."),
  max: z.number().describe("The estimated maximum reasonable price for the job in INR."),
  explanation: z.string().describe("A brief justification for the price range, considering the job's complexity, skills, and location."),
});

// Define the AI flow for generating a price estimate
export const generatePriceEstimate = globalFlow(
  {
    name: "generatePriceEstimate",
    inputSchema: PriceEstimateInputSchema,
    outputSchema: PriceEstimateOutputSchema,
  },
  async (input) => {
    // Use a hypothetical prompt for now. In a real scenario, this would be more complex.
    const prompt = `
      Based on the following job details, provide a realistic price estimate range in INR for the Indian market.

      Job Title: ${input.jobTitle}
      Description: ${input.jobDescription}
      Skills: ${input.skills.join(", ")}
      Location Pincode: ${input.pincode}

      Consider factors like complexity, skill level, and typical labor costs in this region.
      Provide a simple min/max integer value and a short explanation.
    `;

    const llmResponse = await airo.llm.generate({
      prompt,
      model: "gemini-1.5-pro",
      output: {
        schema: PriceEstimateOutputSchema,
      },
    });

    return llmResponse.output;
  }
);
