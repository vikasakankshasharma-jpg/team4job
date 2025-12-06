
'use server';

import { config } from 'dotenv';
config();

import '@/ai/flows/find-matching-installers.ts';
import '@/ai/flows/generate-job-description.ts';
import '@/ai/flows/ai-assisted-bid-creation.ts';
import '@/ai/flows/suggest-skills.ts';
import '@/ai/flows/generate-job-details.ts';
import '@/ai/flows/aadhar-verification.ts';
import '@/ai/flows/grant-pro-plan.ts';
import '@/ai/flows/reward-top-performers.ts';
import '@/ai/flows/get-bids-for-installer.ts';
import '@/ai/flows/job-scoping-wizard.ts';