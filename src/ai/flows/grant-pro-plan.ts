
'use server';

/**
 * @fileOverview Grants a 30-day Pro Installer subscription to a user.
 * This is an admin-only flow intended to be used as a reward.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import type { User, SubscriptionPlan } from '@/lib/types';
import { toDate } from '@/lib/utils';

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
      // TODO: In a real production scenario, you MUST verify that the caller has 'Admin' privileges.
      // Genkit flows might run in a context where `context.auth` is available.
      // Since this is a server action, ensure it's only exposed to authorized endpoints.

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error("User not found.");
      }
      
      // Dynamic Plan Resolution
      // First try the hardcoded ID, then fall back to searching by name/role
      let plan: SubscriptionPlan | null = null;
      const specificPlanId = 'pro-installer-annual';
      const planRef = doc(db, 'subscriptionPlans', specificPlanId);
      const planSnap = await getDoc(planRef);

      if (planSnap.exists()) {
          plan = planSnap.data() as SubscriptionPlan;
      } else {
          // Fallback: Find any 'Installer' plan that contains "Pro" in the name
          console.warn(`Plan '${specificPlanId}' not found. Searching for alternative Pro plan.`);
          const q = query(collection(db, 'subscriptionPlans'), where('role', '==', 'Installer'));
          const querySnapshot = await getDocs(q);
          const proPlanDoc = querySnapshot.docs.find(d => (d.data() as SubscriptionPlan).name.toLowerCase().includes('pro'));
          
          if (proPlanDoc) {
              plan = proPlanDoc.data() as SubscriptionPlan;
          }
      }

      if (!plan) {
          throw new Error("Could not find a valid 'Pro Installer' subscription plan to grant.");
      }

      const user = userSnap.data() as User;
      
      const now = new Date();
      const currentExpiry = (user.subscription && toDate(user.subscription.expiresAt) > now)
        ? toDate(user.subscription.expiresAt)
        : now;
      
      const newExpiryDate = new Date(currentExpiry);
      newExpiryDate.setDate(newExpiryDate.getDate() + 30); // Grant 30 days

      await updateDoc(userRef, {
        'subscription.planId': plan.id,
        'subscription.planName': plan.name,
        'subscription.expiresAt': newExpiryDate,
      });

      return {
        success: true,
        message: `Successfully granted 30 days of ${plan.name} to ${user.name}.`,
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
