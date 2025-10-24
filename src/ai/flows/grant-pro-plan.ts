
'use server';

/**
 * @fileOverview Grants a 30-day Pro Installer subscription to a user.
 * This is an admin-only flow intended to be used as a reward.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import type { User, SubscriptionPlan } from '@/lib/types';

const GrantProPlanInputSchema = z.object({
  userId: z.string().describe('The ID of the user to grant the subscription to.'),
});
export type GrantProPlanInput = z.infer<typeof GrantProPlanInputSchema>;

const GrantProPlanOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type GrantProPlanOutput = z.infer<typeof GrantProPlanOutputSchema>;

export const grantProPlan = ai.defineFlow(
  {
    name: 'grantProPlan',
    inputSchema: GrantProPlanInputSchema,
    outputSchema: GrantProPlanOutputSchema,
  },
  async ({ userId }) => {
    try {
      const userRef = doc(db, 'users', userId);
      const proPlanRef = doc(db, 'subscriptionPlans', 'pro-installer-annual');
      
      const [userSnap, planSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(proPlanRef),
      ]);

      if (!userSnap.exists()) {
        throw new Error("User not found.");
      }
      if (!planSnap.exists()) {
          throw new Error("Pro Installer plan not found in database.");
      }

      const user = userSnap.data() as User;
      const plan = planSnap.data() as SubscriptionPlan;
      
      const now = new Date();
      const currentExpiry = (user.subscription && toDate(user.subscription.expiresAt) > now)
        ? toDate(user.subscription.expiresAt)
        : now;
      
      const newExpiryDate = new Date(currentExpiry);
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);

      await updateDoc(userRef, {
        'subscription.planId': plan.id,
        'subscription.planName': plan.name,
        'subscription.expiresAt': newExpiryDate,
      });

      return {
        success: true,
        message: `Successfully granted 30 days of Pro Plan to ${user.name}.`,
      };

    } catch (error: any) {
      console.error("Error granting pro plan:", error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred.',
      };
    }
  }
);
