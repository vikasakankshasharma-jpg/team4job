
'use server';

/**
 * @fileOverview This flow automates rewarding the top 3 monthly installers.
 *
 * It calculates monthly performance based on reputation points, then uses
 * rating and tenure as tie-breakers. The top 3 are granted a 30-day
 * Pro Installer subscription.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { grantProPlan } from '@/ai/flows/grant-pro-plan';
import type { User } from '@/lib/types';
import { getMonth, getYear, subMonths, format } from 'date-fns';


const toDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};


const RewardTopPerformersInputSchema = z.object({}).optional();
export type RewardTopPerformersInput = z.infer<typeof RewardTopPerformersInputSchema>;

const RewardTopPerformersOutputSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  rewardedUsers: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type RewardTopPerformersOutput = z.infer<typeof RewardTopPerformersOutputSchema>;

export const rewardTopPerformers = ai.defineFlow(
  {
    name: 'rewardTopPerformers',
    inputSchema: RewardTopPerformersInputSchema,
    outputSchema: RewardTopPerformersOutputSchema,
  },
  async () => {
    try {
      console.log("[Automation] Starting: Reward Top Performers");

      // 1. Fetch all active installers
      const installersQuery = query(
        collection(db, 'users'),
        where('roles', 'array-contains', 'Installer'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(installersQuery);
      const installers = snapshot.docs.map(doc => doc.data() as User);

      // 2. Calculate monthly performance and rank them
      const now = new Date();
      const lastMonthDate = subMonths(now, 1);
      const lastMonthName = format(lastMonthDate, 'MMMM yyyy');

      const twoMonthsAgoDate = subMonths(now, 2);
      const twoMonthsAgoName = format(twoMonthsAgoDate, 'MMMM yyyy');

      const rankedInstallers = installers
        .map(installer => {
          const history = installer.installerProfile?.reputationHistory || [];
          
          const lastMonthEntry = history.find(h => h.month === lastMonthName);
          const twoMonthsAgoEntry = history.find(h => h.month === twoMonthsAgoName);

          const lastMonthPoints = lastMonthEntry?.points || 0;
          const twoMonthsAgoPoints = twoMonthsAgoEntry?.points || 0;
          const monthlyPoints = Math.max(0, lastMonthPoints - twoMonthsAgoPoints);

          return { ...installer, monthlyPoints };
        })
        .sort((a, b) => {
          if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
          if ((b.installerProfile?.rating || 0) !== (a.installerProfile?.rating || 0)) return (b.installerProfile?.rating || 0) - (a.installerProfile?.rating || 0);
          return toDate(a.memberSince).getTime() - toDate(b.memberSince).getTime();
        });

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
