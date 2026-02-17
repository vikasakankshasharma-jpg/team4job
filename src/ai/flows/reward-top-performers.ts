
// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This flow automates rewarding the top 3 monthly installers.
 *
 * It calculates monthly performance based on reputation points, then uses
 * rating and tenure as tie-breakers. The top 3 are granted a 30-day
 * Pro Installer subscription.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'zod';

import { getAdminDb } from '@/lib/firebase/server-init';
import { grantProPlan } from '@/ai/flows/grant-pro-plan';
import type { User } from '@/lib/types';
import { calculateMonthlyPerformance } from '@/lib/utils';


const RewardTopPerformersInputSchema = z.object({}).optional();
export type RewardTopPerformersInput = z.infer<typeof RewardTopPerformersInputSchema>;

const RewardTopPerformersOutputSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  rewardedUsers: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type RewardTopPerformersOutput = z.infer<typeof RewardTopPerformersOutputSchema>;

export const rewardTopPerformers = defineLoggedFlow(
  {
    name: 'rewardTopPerformers',
    inputSchema: RewardTopPerformersInputSchema,
    outputSchema: RewardTopPerformersOutputSchema,
  },
  async () => {
    try {
      console.log("[Automation] Starting: Reward Top Performers");

      // Note: Ideally, check for Admin privileges here.
      // Since `grantProPlan` performs checks or is admin-only logic, and this flow 
      // is exposed as a server action to be called by the admin dashboard,
      // we rely on the implementation of `grantProPlan` and the caller's context 
      // in the frontend to be an admin (which is checked in ReportsPage).

      // 1. Fetch all active installers
      const db = getAdminDb();
      const snapshot = await db.collection('users')
        .where('roles', 'array-contains', 'Installer')
        .where('status', '==', 'active')
        .get();
      const installers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

      // 2. Calculate monthly performance and rank them using shared logic
      const rankedInstallers = calculateMonthlyPerformance(installers);

      // 3. Select top 3 performers
      const top3 = rankedInstallers.slice(0, 3);
      console.log(`[Automation] Top 3 performers identified:`, top3.map(u => u.name));

      if (top3.length === 0) {
        return { success: true, summary: "No eligible installers found to reward.", rewardedUsers: [] };
      }

      // 4. Grant rewards
      const rewardPromises = top3.map(user => grantProPlan({ userId: user.id }));
      const results = await Promise.all(rewardPromises);

      const rewardedUsers: { id: string, name: string }[] = [];
      results.forEach((result, index) => {
        if (result.success) {
          rewardedUsers.push({ id: top3[index].id, name: top3[index].name });
        } else {
          console.error(`[Automation] Failed to reward ${top3[index].name}: ${result.message}`);
        }
      });

      console.log(`[Automation] Successfully rewarded ${rewardedUsers.length} users.`);

      return {
        success: true,
        summary: `Successfully rewarded ${rewardedUsers.length} top performer(s) with a 30-day Pro Plan.`,
        rewardedUsers,
      };

    } catch (error: any) {
      console.error("[Automation] Error rewarding top performers:", error);
      return {
        success: false,
        summary: error.message || 'An unexpected error occurred during the automation.',
        rewardedUsers: [],
      };
    }
  }
);
