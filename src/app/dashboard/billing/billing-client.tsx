
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
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { SubscriptionPlan, User } from "@/lib/types";
import { collection, getDocs, query, where, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { format, formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { toDate } from "@/lib/utils";
import { useHelp } from "@/hooks/use-help";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
// import axios from "axios"; // Removed
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

declare const cashfree: any;

function RedeemCouponCard({ onSubscriptionUpdate }: { onSubscriptionUpdate: () => void }) {
  const { user } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('billing');
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeem = async () => {
    if (!couponCode.trim()) {
      toast({ title: t('pleaseEnterCode'), variant: "destructive" });
      return;
    }
    if (!db || !user) return;
    setIsLoading(true);

    const couponRef = doc(db, "coupons", couponCode.toUpperCase());
    const couponSnap = await getDoc(couponRef);

    if (!couponSnap.exists()) {
      toast({ title: t('invalidCode'), description: t('codeNotExist'), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const coupon = couponSnap.data() as any;
    const now = new Date();

    if (!coupon.isActive || toDate(coupon.validUntil) < now || toDate(coupon.validFrom) > now) {
      toast({ title: t('codeNotValid'), description: t('codeExpired'), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.id));
    const userData = userDoc.data();
    const userRoles = userData?.roles || [];
    const userRole = userRoles.includes('Professional') ? 'Professional' : 'Client';

    if (coupon.applicableToRole !== 'Any' && coupon.applicableToRole !== userRole) {
      toast({ title: t('codeNotApplicable'), description: t('codeRoleError', { role: coupon.applicableToRole }), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.id);
    const currentExpiry = userData?.subscription && toDate(userData.subscription.expiresAt) > now ? toDate(userData.subscription.expiresAt) : now;
    const newExpiryDate = new Date(currentExpiry);
    newExpiryDate.setDate(newExpiryDate.getDate() + coupon.durationDays);

    await updateDoc(userRef, {
      'subscription.planId': coupon.planId,
      'subscription.planName': coupon.description,
      'subscription.expiresAt': newExpiryDate
    });

    onSubscriptionUpdate();
    toast({
      title: t('codeRedeemed'),
      description: t('codeRedeemedDesc', { days: coupon.durationDays }),
      variant: "default"
    });
    setCouponCode('');
    setIsLoading(false);
  };

  return (
    <Card className="border-0 shadow-sm shadow-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight"><Ticket className="h-5 w-5 text-primary/60" /> {t('redeemCardTitle')}</CardTitle>
        <CardDescription>{t('redeemCardDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t('enterCode')}
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleRedeem} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('redeem')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingClient() {
  const { user, role, loading: userLoading, setUser } = useUser();
  const { db } = useFirebase();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { setHelp } = useHelp();
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('billing');

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

  // Poll for subscription updates if payment was successful
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    if (paymentStatus === 'success') {
      const interval = setInterval(fetchUser, 2000); // Poll every 2 seconds
      // Stop polling after 10 seconds or when subscription is active
      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [searchParams, fetchUser]);

  useEffect(() => {
    setHelp({
      title: t('helpTitle'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('helpContent')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('currentPlan')}</span> {t('currentPlanDesc')}</li>
            <li><span className="font-semibold">{t('availablePlans')}</span> {t('availablePlansHelpDesc')}</li>
            <li><span className="font-semibold">{t('redeemCoupon')}</span> {t('redeemCouponDesc')}</li>
          </ul>
        </div>
      )
    });
  }, [setHelp, t]);

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!user || !db) return;
    setIsPurchasing(plan.id);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error(t('loginRequired'));
      }

      const response = await fetch('/api/escrow/initiate-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: `SUB-${user.id}-${plan.id}-${Date.now()}`,
          jobTitle: `Subscription: ${plan.name}`,
          clientId: user.id, // Payer is the user
          planId: plan.id, // Explicitly pass plan ID
          professionalId: 'PLATFORM', // Payee is the platform
          amount: plan.price,
          travelTip: 0,
          clientFee: 0,
        })
      });

      const responseData = await response.json();

      if (!responseData.payment_session_id) {
        throw new Error(t('sessionError'));
      }

      const redirectUrl = searchParams.get('redirectUrl');

      const cashfree = new (window as any).Cashfree(responseData.payment_session_id);
      cashfree.checkout({
        payment_method: "upi",
        onComplete: async (data: any) => {
          if (data.order && data.order.status === 'PAID') {
            toast({
              title: t('paymentSuccess'),
              description: t('paymentSuccessDesc'),
              variant: "default",
            });
            // We do NOT update the DB here. We wait for the webhook.
            // But we can trigger a re-fetch or show a pending state.


            // Wait a moment for webhook to process
            setTimeout(() => {
              fetchUser();
              if (redirectUrl) {
                router.push(redirectUrl);
              }
            }, 3000);

          } else {
            throw new Error(t('paymentFailedDesc'));
          }
        },
        onError: (errorData: any) => {
          toast({
            title: t('paymentFailed'),
            description: errorData.error.message || t('paymentFailedDesc'),
            variant: "destructive",
          });
        },
      });

    } catch (error: any) {
      toast({
        title: t('initiateFailed'),
        description: error.response?.data?.error || t('error'),
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

  return (
    <div className="grid gap-8 max-w-full overflow-x-hidden px-4 font-sans selection:bg-blue-500 selection:text-white bg-surface dark:bg-slate-950 text-on-surface min-h-screen pt-8 pb-16">
        <Card className="border-none shadow-xl shadow-black/5 bg-surface-container-low dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {userLoading ? <Skeleton className="h-10 w-1/2" /> : (
            isSubscribed ? (
              <div className="flex items-center justify-between p-4 border-0 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 shadow-sm">
                <div>
                  <p className="text-lg font-semibold">{user.subscription?.planName}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('expiresOn')} {format(toDate(user.subscription!.expiresAt), "PPP")} ({formatDistanceToNowStrict(toDate(user.subscription!.expiresAt), { addSuffix: true })})
                  </p>
                </div>
                <Badge variant="success"><CheckCircle2 className="h-4 w-4 mr-2" />{t('active')}</Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">{t('noSubscription')}</p>
            )
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold tracking-tight">{t('availablePlans')}</CardTitle>
            <CardDescription>{t('availablePlansDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <Skeleton className="h-32 w-full" /> : (
              plans.map(plan => (
                <Card key={plan.id} className="p-4 border-none shadow-xl shadow-black/5 bg-surface-container-highest dark:bg-slate-800 rounded-3xl hover:shadow-2xl transition-shadow">
                  <CardTitle className="text-lg font-bold tracking-tight mb-2">{plan.name}</CardTitle>
                  <p className="text-2xl font-extrabold mb-2">₹{plan.price.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t('year')}</span></p>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside mb-4">
                    {plan.features.map(f => <li key={f}>{f}</li>)}
                  </ul>
                  <Button className="w-full" onClick={() => handlePurchase(plan)} disabled={isPurchasing === plan.id}>
                    {isPurchasing === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('subscribe')}
                  </Button>
                </Card>
              ))
            )}
            {plans.length === 0 && !loading && (
              <p className="text-muted-foreground text-center py-8">{t('noPlans')}</p>
            )}
          </CardContent>
        </Card>
        <RedeemCouponCard onSubscriptionUpdate={fetchUser} />
      </div>
    </div>
  );
}
