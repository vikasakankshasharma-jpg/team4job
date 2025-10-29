
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Gift, Loader2, Ticket } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { SubscriptionPlan, User } from "@/lib/types";
import { collection, getDocs, query, where, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toDate } from "@/lib/utils";
import { useHelp } from "@/hooks/use-help";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";

declare const cashfree: any;

function RedeemCouponCard({ onSubscriptionUpdate }: { onSubscriptionUpdate: () => void }) {
    const { user, db } = useFirebase();
    const { toast } = useToast();
    const [couponCode, setCouponCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleRedeem = async () => {
        if (!couponCode.trim()) {
            toast({ title: "Please enter a coupon code.", variant: "destructive" });
            return;
        }
        if (!db || !user) return;
        setIsLoading(true);

        const couponRef = doc(db, "coupons", couponCode.toUpperCase());
        const couponSnap = await getDoc(couponRef);

        if (!couponSnap.exists()) {
            toast({ title: "Invalid Coupon Code", description: "The code you entered does not exist.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const coupon = couponSnap.data() as any;
        const now = new Date();

        if (!coupon.isActive || toDate(coupon.validUntil) < now || toDate(coupon.validFrom) > now) {
            toast({ title: "Coupon Not Valid", description: "This coupon is either inactive or expired.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const userRoles = userData?.roles || [];
        const userRole = userRoles.includes('Installer') ? 'Installer' : 'Job Giver';
        
        if (coupon.applicableToRole !== 'Any' && coupon.applicableToRole !== userRole) {
            toast({ title: "Coupon Not Applicable", description: `This coupon is only valid for ${coupon.applicableToRole}s.`, variant: "destructive" });
            setIsLoading(false);
            return;
        }
        
        const userRef = doc(db, 'users', user.uid);
        const currentExpiry = userData?.subscription && toDate(userData.subscription.expiresAt) > now ? toDate(userData.subscription.expiresAt) : now;
        const newExpiryDate = new Date(currentExpiry.setDate(currentExpiry.getDate() + coupon.durationDays));

        await updateDoc(userRef, {
            'subscription.planId': coupon.planId,
            'subscription.planName': coupon.description,
            'subscription.expiresAt': newExpiryDate
        });
        
        onSubscriptionUpdate();
        toast({
            title: "Coupon Redeemed!",
            description: `Your subscription has been extended by ${coupon.durationDays} days.`,
            variant: "success"
        });
        setCouponCode('');
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Redeem a Coupon</CardTitle>
                <CardDescription>Have a coupon code? Enter it here to extend your subscription or get premium features.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-2">
                    <Input
                        placeholder="Enter Coupon Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button onClick={handleRedeem} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Redeem
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function BillingPage() {
  const { user, role, loading: userLoading, setUser } = useUser();
  const { db } = useFirebase();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { setHelp } = useHelp();
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    if (!db || !role) return;
    setLoading(true);
    const q = query(
      collection(db, "subscriptionPlans"),
      where("isArchived", "==", false),
      where("role", "in", [role, "Any"])
    );
    const snapshot = await getDocs(q);
    setPlans(snapshot.docs.map(doc => doc.data() as SubscriptionPlan));
    setLoading(false);
  }, [db, role]);

  const fetchUser = useCallback(async () => {
    if (!db || !user) return;
    const userDoc = await getDoc(doc(db, 'users', user.id));
    if (userDoc.exists() && setUser) {
      setUser({ id: userDoc.id, ...userDoc.data() } as any);
    }
  }, [db, user, setUser]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    setHelp({
      title: "Subscription & Billing",
      content: (
        <div className="space-y-4 text-sm">
          <p>This is your central hub for managing your platform subscription.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Current Plan:</span> View your active subscription and its expiry date. All new users start with a free trial.</li>
            <li><span className="font-semibold">Available Plans:</span> Browse and purchase subscription plans tailored for your role to unlock premium features.</li>
            <li><span className="font-semibold">Redeem Coupon:</span> If you have a promotional coupon, enter it here to activate or extend your subscription.</li>
          </ul>
        </div>
      )
    });
  }, [setHelp]);

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!user || !db) return;
    setIsPurchasing(plan.id);

    try {
      const response = await axios.post('/api/escrow/initiate-payment', {
        jobId: `SUB-${user.id}-${plan.id}-${Date.now()}`,
        jobTitle: `Subscription: ${plan.name}`,
        jobGiverId: user.id, // Payer is the user
        installerId: 'PLATFORM', // Payee is the platform
        amount: plan.price,
      });

      if (!response.data.payment_session_id) {
        throw new Error("Could not retrieve payment session ID.");
      }

      const cashfree = new (window as any).Cashfree(response.data.payment_session_id);
      cashfree.checkout({
        payment_method: "upi",
        onComplete: async () => {
          const now = new Date();
          const currentExpiry = user.subscription && toDate(user.subscription.expiresAt) > now ? toDate(user.subscription.expiresAt) : now;
          const newExpiryDate = new Date(currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)); // Assuming annual plans

          await updateDoc(doc(db, 'users', user.id), {
            'subscription.planId': plan.id,
            'subscription.planName': plan.name,
            'subscription.expiresAt': newExpiryDate,
          });

          toast({
            title: "Purchase Successful!",
            description: `You are now subscribed to the ${plan.name} plan.`,
            variant: "success",
          });
          fetchUser();
        },
        onError: (errorData: any) => {
          console.error("Cashfree onError:", errorData);
          toast({
            title: "Payment Failed",
            description: errorData.error.message || "The payment could not be completed.",
            variant: "destructive",
          });
        },
      });

    } catch (error: any) {
      toast({
        title: "Failed to Initiate Payment",
        description: error.response?.data?.error || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle>My Subscription</CardTitle>
          <CardDescription>View your current plan and manage your subscription.</CardDescription>
        </CardHeader>
        <CardContent>
          {userLoading ? <Skeleton className="h-10 w-1/2" /> : (
            isSubscribed ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary">
                <div>
                  <p className="text-lg font-semibold">{user.subscription?.planName}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires on {format(toDate(user.subscription!.expiresAt), "PPP")} ({formatDistanceToNowStrict(toDate(user.subscription!.expiresAt), { addSuffix: true })})
                  </p>
                </div>
                <Badge variant="success"><CheckCircle2 className="h-4 w-4 mr-2" />Active</Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">You do not have an active subscription.</p>
            )
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 lg:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>Upgrade your account to unlock more features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? <Skeleton className="h-32 w-full" /> : (
                    plans.map(plan => (
                        <Card key={plan.id} className="p-4">
                             <CardTitle className="text-lg mb-2">{plan.name}</CardTitle>
                             <p className="text-2xl font-bold mb-2">₹{plan.price.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ year</span></p>
                             <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside mb-4">
                                {plan.features.map(f => <li key={f}>{f}</li>)}
                             </ul>
                             <Button className="w-full" onClick={() => handlePurchase(plan)} disabled={isPurchasing === plan.id}>
                                {isPurchasing === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Subscribe
                             </Button>
                        </Card>
                    ))
                )}
                 {plans.length === 0 && !loading && (
                    <p className="text-muted-foreground text-center py-8">No subscription plans are currently available for your role.</p>
                )}
            </CardContent>
         </Card>
         <RedeemCouponCard onSubscriptionUpdate={fetchUser} />
      </div>
    </div>
  );
}
