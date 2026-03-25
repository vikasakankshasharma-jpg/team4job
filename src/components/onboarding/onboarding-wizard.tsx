"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding-store";
import { BasicInfo } from "./steps/basic-info";
import { Experience } from "./steps/experience";
import { Documents } from "./steps/documents";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function OnboardingWizard() {
    const t = useTranslations('onboarding');
    const tSkills = useTranslations('skills');
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const steps = [
        { id: 1, name: t('steps.basic') },
        { id: 2, name: t('steps.experience') },
        { id: 3, name: t('steps.documents') },
        { id: 4, name: t('steps.review') }
    ];

    // Connect to store
    const data = useOnboardingStore();
    const updateData = useOnboardingStore((state) => state.updateData);
    const resetStore = useOnboardingStore((state) => state.reset);

    const nextStep = () => {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
        window.scrollTo(0, 0);
    };

    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('firstName', data.firstName);
            formData.append('lastName', data.lastName);
            formData.append('shopName', data.shopName);
            formData.append('city', data.city);
            formData.append('pincode', data.pincode);
            formData.append('experience', data.experience);
            formData.append('skills', JSON.stringify(data.skills));

            if (data.aadharFront) formData.append('aadharFront', data.aadharFront);
            if (data.aadharBack) formData.append('aadharBack', data.aadharBack);
            if (data.panCard) formData.append('panCard', data.panCard);
            if (data.profilePhoto) formData.append('profilePhoto', data.profilePhoto);

            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            const response = await fetch('/api/onboarding/submit', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Submission failed');
            }

            toast({
                title: t('submit.success'),
                description: t('submit.successDesc'),
            });

            resetStore();
            router.push('/dashboard');

        } catch (error) {
            toast({
                title: t('submit.failed'),
                description: t('submit.failedDesc'),
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-12">
            {/* Premium Step Indicator */}
            <div className="max-w-2xl mx-auto mb-16">
                <div className="relative flex justify-between">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-muted/30 -translate-y-1/2 z-0 rounded-full" />
                    <motion.div
                        className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                    />
                    {steps.map((step) => (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: step.id <= currentStep ? 1 : 0.85,
                                    backgroundColor: step.id < currentStep ? "rgb(var(--primary))" : step.id === currentStep ? "rgb(var(--background))" : "rgb(var(--muted))",
                                    borderColor: step.id <= currentStep ? "rgb(var(--primary))" : "rgb(var(--muted-foreground)/0.2)"
                                }}
                                className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold border-2 transition-all duration-500",
                                    step.id === currentStep && "shadow-[0_0_20px_rgba(var(--primary),0.3)] ring-4 ring-primary/10"
                                )}
                            >
                                {step.id < currentStep ? (
                                    <Check className="h-6 w-6 text-primary-foreground" />
                                ) : (
                                    <span className={cn(step.id === currentStep ? "text-primary" : "text-muted-foreground")}>{step.id}</span>
                                )}
                            </motion.div>
                            <span className={cn(
                                "absolute -bottom-8 whitespace-nowrap text-xs font-bold tracking-wider uppercase transition-all duration-300",
                                step.id <= currentStep ? "text-foreground opacity-100" : "text-muted-foreground opacity-50"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content with AnimatePresence */}
            <div className="relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                            <CardContent className="p-8 md:p-12 min-h-[500px]">
                                {currentStep === 1 && <BasicInfo data={data} updateData={updateData} />}
                                {currentStep === 2 && <Experience data={data} updateData={updateData} />}
                                {currentStep === 3 && <Documents data={data} updateData={updateData} />}
                                {currentStep === 4 && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                                {t('review.title')}
                                            </h2>
                                            <p className="text-muted-foreground">{t('review.pendingDesc')}</p>
                                        </div>
                                        
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-4">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">1</span>
                                                    {t('review.basicInfo')}
                                                </h3>
                                                <div className="space-y-2 text-sm">
                                                    <p className="flex justify-between"><span className="text-muted-foreground">{t('review.name')}:</span> <span className="font-bold">{data.firstName} {data.lastName}</span></p>
                                                    <p className="flex justify-between"><span className="text-muted-foreground">{t('review.city')}:</span> <span className="font-bold">{data.city} ({data.pincode})</span></p>
                                                    <p className="flex justify-between"><span className="text-muted-foreground">{t('review.shop')}:</span> <span className="font-bold">{data.shopName || "N/A"}</span></p>
                                                </div>
                                            </div>
                                            
                                            <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-4">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">2</span>
                                                    {t('review.experience')}
                                                </h3>
                                                <div className="space-y-2 text-sm">
                                                    <p className="flex justify-between">
                                                        <span className="text-muted-foreground">{t('review.years')}:</span> 
                                                        <span className="font-bold">{t(`experience.years${data.experience?.replace('-', '').replace('+', 'plus')}`)}</span>
                                                    </p>
                                                    <p className="flex flex-col gap-1">
                                                        <span className="text-muted-foreground">{t('experience.categoryLabel')}:</span> 
                                                        <span className="font-bold text-primary">{data.category ? t(`experience.categories.${data.category}.label`) : t('review.noneSelected')}</span>
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {(data.skills || []).map((s: string) => (
                                                            <span key={s} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                                                                {tSkills(s)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
                                            <AlertCircle className="h-6 w-6 text-primary shrink-0 transition-transform hover:scale-110" />
                                            <div className="text-sm">
                                                <p className="font-bold text-primary mb-1">{t('review.pendingTitle')}</p>
                                                <p className="text-muted-foreground leading-relaxed">{t('review.pendingDesc')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Premium Navigation Buttons */}
            <div className="flex justify-between max-w-2xl mx-auto w-full gap-4">
                <Button 
                    variant="ghost" 
                    onClick={prevStep} 
                    disabled={currentStep === 1 || isSubmitting}
                    className="h-14 px-8 rounded-2xl font-bold hover:bg-muted/10"
                >
                    {t('steps.back') || 'Back'}
                </Button>
                
                {currentStep === steps.length ? (
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="h-14 px-12 rounded-2xl font-bold shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                {t('submit.button')}
                                <Check className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                ) : (
                    <Button 
                        onClick={nextStep}
                        className="h-14 px-12 rounded-2xl font-bold shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {t('steps.next') || 'Next'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                )}
            </div>
        </div>
    );
}
