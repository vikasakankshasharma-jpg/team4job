'use server';

import { generatePriceEstimateFlow } from './flows/generate-price-estimate';
import type { GeneratePriceEstimateInput, GeneratePriceEstimateOutput } from './flows/generate-price-estimate-schema';

export async function generatePriceEstimate(input: GeneratePriceEstimateInput): Promise<GeneratePriceEstimateOutput> {
    return generatePriceEstimateFlow(input);
}

import { generateJobDetailsFlow } from './flows/generate-job-details';
import type { GenerateJobDetailsInput, GenerateJobDetailsOutput } from './flows/generate-job-details-schema';

export async function generateJobDetails(input: GenerateJobDetailsInput): Promise<GenerateJobDetailsOutput> {
    return generateJobDetailsFlow(input);
}
