
// 'use server'; removed to fix invalid export error

/**
 * @fileOverview Grants a 30-day Pro Installer subscription to a user.
 * This is an admin-only flow intended to be used as a reward.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/server-init';
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
  async ({ userId }: z.infer<typeof GrantProPlanInputSchema>, context: any) => {
    try {
      // Verify that the caller has 'Admin' privileges.
      if (!context?.auth) {
        throw new Error("Unauthorized: User is not authenticated.");
      }

      // Check for Admin role claim
      if (context.auth.token?.role !== 'Admin') {
        throw new Error("Forbidden: Only Admins can grant Pro plans.");
      }

      const db = getAdminDb();
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw new Error("User not found.");
      }

      // Dynamic Plan Resolution
      let plan: SubscriptionPlan | null = null;
      const specificPlanId = 'pro-installer-annual';
      const planRef = db.collection('subscriptionPlans').doc(specificPlanId);
      const planSnap = await planRef.get();

      if (planSnap.exists) {
        plan = planSnap.data() as SubscriptionPlan;
      } else {
        // Fallback: Find any 'Installer' plan that contains "Pro" in the name
        console.warn(`Plan '${specificPlanId}' not found. Searching for alternative Pro plan.`);
        const querySnapshot = await db.collection('subscriptionPlans')
          .where('role', '==', 'Installer')
          .get();

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
      // Handle potential different timestamp formats (Admin SDK vs Client SDK data)
      let expiresAtDate = now;
      if (user.subscription?.expiresAt) {
        // @ts-ignore - Handle potential firestore timestamp from client SDK data types if mixed
        const existingDate = user.subscription.expiresAt.toDate ? user.subscription.expiresAt.toDate() : new Date(user.subscription.expiresAt);
        if (existingDate > now) {
          expiresAtDate = existingDate;
        }
      }

      const newExpiryDate = new Date(expiresAtDate);
      newExpiryDate.setDate(newExpiryDate.getDate() + 30); // Grant 30 days

      await userRef.update({
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
