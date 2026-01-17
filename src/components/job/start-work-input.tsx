"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Job, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import axios from "axios";

export function StartWorkInput({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const [otp, setOtp] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleStartWork = async () => {
        if (!otp || otp.length < 6) return;
        setIsLoading(true);
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            await axios.post('/api/jobs/start-work', {
                jobId: job.id,
                userId: user.id,
                otp: otp
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: "Work Started", description: "You have officially started the job." });
            onJobUpdate({ workStartedAt: new Date() as any });
        } catch (error: any) {
            toast({ title: "Error", description: "Invalid Start Code.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-2 p-3 border rounded-md bg-muted/20">
            <Label className="text-xs font-semibold">Start Code</Label>
            <div className="flex gap-2">
                <Input
                    placeholder="Enter Code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="font-mono h-12 text-lg tracking-widest"
                />
                <Button size="sm" onClick={handleStartWork} disabled={isLoading || otp.length < 6}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start"}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Ask the customer for the code upon arrival.</p>
        </div>
    );
}
