"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Job, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";


import { useTranslations } from "next-intl";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { KeyRound, ShieldCheck, Zap, Play } from "lucide-react";

export function StartWorkInput({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const [otp, setOtp] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const t = useTranslations('professional.jobActions.startWork');

    const handleStartWork = async () => {
        if (!otp || otp.length < 6) return;
        setIsLoading(true);
        try {
            const { startWorkAction } = await import("@/app/actions/job.actions");
            const res = await startWorkAction(job.id, user.id, otp);

            if (!res.success) {
                throw new Error(res.error || t('error'));
            }

            toast({ 
                title: "Production Commenced!", 
                description: "The secure protocol is active and work has officially started.",
                className: "bg-primary text-white border-none rounded-3xl"
            });
            onJobUpdate({ workStartedAt: new Date() as any });
        } catch (error: any) {
            toast({ title: t('error'), description: error.message || t('error'), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 blur-2xl opacity-50 -z-10" />

            <div className="p-8 rounded-[2.5rem] bg-surface-container-low dark:bg-slate-900/50 border border-muted/20 backdrop-blur-xl shadow-2xl shadow-primary/5 space-y-8">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                        <KeyRound className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-black tracking-tight italic uppercase">{t('label')}</h4>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Security Handshake Required</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="relative group/input">
                        <Input
                            placeholder={t('placeholder')}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            maxLength={6}
                            data-testid="otp-input"
                            className="h-20 w-full text-center text-4xl font-black tracking-[0.8em] pl-[0.5em] rounded-3xl border-none bg-muted/40 focus-visible:ring-4 focus-visible:ring-primary/20 transition-all placeholder:opacity-20"
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-20">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 items-center">
                        <Zap className="h-4 w-4 text-primary animate-pulse" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                            Enter the OTP provided by the client to activate the secure production protocol and release protection.
                        </p>
                    </div>

                    <Button 
                        onClick={handleStartWork} 
                        disabled={isLoading || otp.length < 6}
                        data-testid="start-work-button"
                        className="w-full h-16 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all group overflow-hidden relative"
                    >
                        <span className="relative z-10 flex items-center">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2 fill-current" />}
                            {t('button')}
                        </span>
                        <div className="absolute inset-0 bg-background/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
