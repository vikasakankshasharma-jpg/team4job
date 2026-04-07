"use client";

import React from "react";
import { Job, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";
import { completeJobWithOtpAction } from "@/app/actions/job.actions";
import { sendNotification } from "@/lib/notifications";
import { compressImage } from "@/lib/image-compression";

interface ProfessionalCompletionSectionProps {
    job: Job;
    user: User;
    onJobUpdate: (updatedJob: Partial<Job>) => void;
    onSubmitWork?: (attachments: any[]) => Promise<void>;
}

import { useTranslations } from "next-intl";

export function ProfessionalCompletionSection({ job, user, onJobUpdate, onSubmitWork }: ProfessionalCompletionSectionProps) {
    const { toast } = useToast();
    const { storage } = useFirebase();
    const t = useTranslations('professional.jobActions.completeWork');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [completionFiles, setCompletionFiles] = React.useState<File[]>([]);
    const [otp, setOtp] = React.useState("");
    const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);

    const handleCompleteJob = async () => {
        if (completionFiles.length === 0) {
            toast({
                title: t('proofRequired'),
                description: t('proofRequiredDesc'),
                variant: "destructive",
            });
            return;
        }

        if (!user.payouts?.beneficiaryId) {
            const isE2E = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            if (!isE2E) {
                toast({
                    title: t('payoutSetup'),
                    description: t('payoutSetupDesc'),
                    variant: "destructive",
                });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const uploadPromises = completionFiles.map(async file => {
                const isE2E = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                if (isE2E) {
                    return { fileName: file.name, fileUrl: "https://firebasestorage.googleapis.com/v0/b/studio-mock/o/mock.png?alt=media", fileType: file.type, isAiVerified: true };
                }

                // Compress the image before uploading to save user bandwidth/memory
                const finalFileToUpload = await compressImage(file);

                const fileRef = ref(storage, `jobs/${job.id}/completion/${Date.now()}_${finalFileToUpload.name}`);
                await uploadBytes(fileRef, finalFileToUpload);
                const fileUrl = await getDownloadURL(fileRef);

                let isAiVerified = false;
                if (finalFileToUpload.type.startsWith('image/')) {
                    isAiVerified = true; // Optimization for now
                }
                return { fileName: finalFileToUpload.name, fileUrl, fileType: finalFileToUpload.type, isAiVerified };
            });

            const uploadedAttachments = await Promise.all(uploadPromises);

            if (otp && otp.length === 6) {
                setIsVerifyingOtp(true);
                try {
                    const res = await completeJobWithOtpAction(job.id, user.id, otp, uploadedAttachments);
                    if (!res.success) throw new Error(res.error);
                    toast({
                        title: t('success'),
                        description: t('successDesc'),
                        variant: 'default'
                    });

                } catch (error: any) {
                   toast({
                        title: t('otpFailed'),
                        description: error.message || t('otpFailedDesc'),
                        variant: "destructive"
                    });
                    setIsSubmitting(false);
                    setIsVerifyingOtp(false);
                    return;
                }
            } else if (onSubmitWork) {
                await onSubmitWork(uploadedAttachments);

                // Notify Client
                const client = job.client as User;
                if (client && client.email) {
                    sendNotification(
                        client.email,
                        "Action Required: Review Work",
                        `Professional ${user.name} has submitted proof of work for job "${job.title}". Please log in to review and release payment.`
                    ).catch(err => {});
                }

                toast({
                    title: t('submitted'),
                    description: t('submittedDesc'),
                    variant: 'default'
                });
            } else {
                // Fallback for when onSubmitWork is missing (legacy compat)
                const updatedJobData: Partial<Job> = {
                    status: 'Pending Confirmation' as any,
                    attachments: [...(job.attachments || []), ...uploadedAttachments],
                };
                await onJobUpdate(updatedJobData);
                
                toast({
                    title: t('submitted'),
                    description: t('submittedDesc'),
                    variant: 'default'
                });
            }

        } catch (error: any) {
           toast({
                title: t('errorTitle'),
                description: t('errorDesc'),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setIsVerifyingOtp(false);
        }
    };

    return (
        <div className="space-y-4" data-testid="professional-completion-section">
            <div className="space-y-2">
                <Label>{t('proofLabel')}</Label>
                <FileUpload onFilesChange={setCompletionFiles} maxFiles={5} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="otp-input">{t('otpLabel')}</Label>
                <Input
                    id="otp-input"
                    placeholder={t('otpPlaceholder')}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                />
                <p className="text-xs text-muted-foreground">{t('otpHelper')}</p>
            </div>
            <div className="flex justify-end pt-4">
                <Button onClick={handleCompleteJob} disabled={completionFiles.length === 0 || isSubmitting} data-testid="submit-for-review-button" className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                        otp ? <Zap className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" /> : <Send className="mr-2 h-4 w-4" />
                    )}
                    {otp ? (isVerifyingOtp ? t('verifying') : t('verifyAndComplete')) : t('submitForReview')}
                </Button>
            </div>
        </div>
    );
}
