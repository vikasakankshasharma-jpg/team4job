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

            toast({ title: t('success'), description: t('successDesc') });
            onJobUpdate({ workStartedAt: new Date() as any });
        } catch (error: any) {
            toast({ title: t('error'), description: error.message || t('error'), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-2 p-3 border rounded-md bg-muted/20">
            <Label className="text-xs font-semibold">{t('label')}</Label>
            <div className="flex gap-2">
                <Input
                    placeholder={t('placeholder')}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="font-mono h-12 text-lg tracking-widest"
                />
                <Button size="sm" onClick={handleStartWork} disabled={isLoading || otp.length < 6}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('button')}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">{t('helper')}</p>
        </div>
    );
}
