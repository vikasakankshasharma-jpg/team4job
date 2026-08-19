"use client";

import React from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Coins, Share2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ReferralClient() {
  const { user } = useUser();
  const { toast } = useToast();

  if (!user) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const referralCode = user.id; // Or a shortened code
  // Assuming frontend is running on same origin
  const referralLink = `${window.location.origin}/login?ref=${referralCode}&tab=signup`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Team4Job',
          text: 'Use my invite link to sign up for Team4Job!',
          url: referralLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Referrals & Rewards</h1>
        <p className="text-muted-foreground">Invite friends and earn a 5% commission on their platform fees!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border border-primary/20 shadow-xl rounded-[2rem] bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl font-black italic flex items-center gap-2">
              <Share2 className="h-6 w-6 text-primary" />
              Your Invite Link
            </CardTitle>
            <CardDescription>Share this link anywhere to start earning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={referralLink} 
                className="bg-background font-mono text-xs rounded-xl"
              />
              <Button onClick={copyToClipboard} variant="secondary" className="rounded-xl">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={shareLink} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest">
              Share Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-xl rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-2xl font-black italic flex items-center gap-2">
              <Coins className="h-6 w-6 text-amber-500" />
              Earnings Overview
            </CardTitle>
            <CardDescription>Your lifetime referral rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <span className="text-6xl font-black tracking-tighter italic text-amber-500 mb-2">
                ?{(user as any).referralEarnings?.toLocaleString() || '0'}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Total Earned
              </span>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-center">
              Earnings are automatically credited to your wallet balance.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

