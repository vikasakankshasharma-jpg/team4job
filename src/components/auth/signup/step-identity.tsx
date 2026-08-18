"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ShieldCheck, Fingerprint, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  initiateAadharVerificationAction, 
  confirmAadharVerificationAction, 
  verifyPanAction 
} from "@/app/actions/ai.actions";
import { useSignupContext, SignUpFormValues } from "./signup-context";

export function StepIdentity() {
  const { control, getValues, watch, setValue, getFieldState, setError: setFormError } = useFormContext<SignUpFormValues>();
  const { 
    setCurrentStep, 
    isLoading, setIsLoading,
    verificationSubStep, setVerificationSubStep,
    verificationId, setVerificationId
  } = useSignupContext();
  
  const { toast } = useToast();
  const tAuth = useTranslations('auth');
  const tError = useTranslations('errors');

  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (e: any) => {
    if (!e) return "An unexpected error occurred.";
    const errorCode = e.code || (e.message?.match(/\(([^)]+)\)/)?.[1]);
    if (errorCode) {
      try {
        return tError(errorCode);
      } catch (err) {
        return e.message || "An error occurred.";
      }
    }
    return e.message || "An error occurred.";
  };

  const handleInitiateVerification = async () => {
    setError(null);
    setIsLoading(true);
    const aadharNumber = getValues("aadhar");
    if (!aadharNumber) {
      setError(tError('aadharRequired'));
      setIsLoading(false);
      return;
    }
    try {
      const result = await initiateAadharVerificationAction({ aadharNumber });
      if (result.success && result.data) {
        setVerificationId(result.data.verificationId);
        setVerificationSubStep("enterOtp");
        toast({ title: tAuth('otpLabel'), description: result.data.message });
      } else {
        setError(getErrorMessage(result.error || 'serverError'));
      }
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmVerification = async () => {
    setError(null);
    setIsLoading(true);
    const otp = getValues("otp");
    if (!otp || otp.length !== 6) {
      setError(tError('invalidOtp'));
      setIsLoading(false);
      return;
    }

    try {
      const result = await confirmAadharVerificationAction({ verificationId, otp });
      if (result.success && result.data && result.data.isVerified) {
        setVerificationSubStep("enterPan");
        toast({ title: tAuth('verifyAadhar'), description: tAuth('verifyPan') });
      } else {
        setError(result.data?.message || getErrorMessage(result.error || 'serverError'));
      }
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPan = async () => {
    setError(null);
    setIsLoading(true);
    const pan = getValues("pan");
    if (!pan || pan.length !== 10) {
      setError(tError('invalidPan'));
      setIsLoading(false);
      return;
    }

    try {
      const result = await verifyPanAction({ pan });
      if (result.success && result.data && result.data.isValid) {
        setVerificationSubStep("verified");
        toast({ title: tAuth('verifyPan'), description: result.data.message });
        setCurrentStep("photo");
      } else {
        setError(result.data?.message || getErrorMessage(result.error || 'serverError'));
      }
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4 mb-14">
        <h3 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">
          {tAuth('stepVerificationTitle') || "IDENTITY PROTOCOL"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
          {tAuth('stepVerificationDesc') || "Secure your terminal access with government-grade credentials"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verification Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Aadhar Box */}
        <div className={cn(
          "p-10 rounded-[3rem] border-none transition-all duration-700 shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1",
          verificationSubStep === 'enterAadhar' || verificationSubStep === 'enterOtp'
            ? "bg-surface-container-low/60 ring-primary/20" 
            : "bg-surface-container-low/40 ring-white/5 opacity-60"
        )}>
          <div className="flex items-start gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-2xl">
              <Fingerprint className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-2">{tAuth('aadharLabel')}</h4>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">PROTOCOL // 12-DIGIT INDEX</p>
            </div>
          </div>

          <FormField
            control={control}
            name="aadhar"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="flex gap-4">
                  <FormControl>
                    <Input
                      placeholder="0000 0000 0000"
                      {...field}
                      maxLength={12}
                      disabled={verificationSubStep !== 'enterAadhar' || isLoading}
                      className="h-16 flex-1 bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all rounded-[1.25rem] px-8 text-xl font-black italic tracking-[0.2em] shadow-inner"
                    />
                  </FormControl>
                  {verificationSubStep === 'enterAadhar' && (
                    <Button
                      type="button"
                      onClick={handleInitiateVerification}
                      disabled={isLoading || field.value?.length !== 12}
                      className="h-16 px-8 rounded-[1.25rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.3em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('confirm')}
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-10 pt-10 border-t border-primary/10"
            >
              <div className="text-center space-y-8">
                <span className="text-[10px] font-black italic uppercase tracking-[0.4em] text-primary block">{tAuth('otpTitle') || "AUTHORIZATION CODE"}</span>
                <div className="flex justify-center scale-110">
                  <OtpInput 
                    value={watch('otp') || ""}
                    onChange={(val) => setValue('otp', val)}
                    length={6}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleConfirmVerification}
                  disabled={isLoading || (watch('otp') || "").length !== 6}
                  className="w-full h-16 rounded-[1.5rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyOtp')}
                </Button>
              </div>
            </motion.div>
        </div>

        {/* PAN Box */}
        <div className={cn(
          "p-10 rounded-[3rem] border-none transition-all duration-700 shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1",
          verificationSubStep === 'enterPan'
            ? "bg-surface-container-low/60 ring-primary/20" 
            : verificationSubStep === 'verified' 
            ? "bg-success/5 ring-success/30" 
            : "bg-surface-container-low/40 ring-white/5 opacity-60"
        )}>
          <div className="flex items-start gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-2xl">
              <CreditCard className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-2">{tAuth('panLabel')}</h4>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">PROTOCOL // TAX IDENTIFIER</p>
            </div>
          </div>

          <FormField
            control={control}
            name="pan"
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-4">
                  <FormControl>
                    <Input
                      placeholder="ABCDE1234F"
                      {...field}
                      maxLength={10}
                      disabled={verificationSubStep !== 'enterPan' || isLoading}
                      className="h-16 flex-1 bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all rounded-[1.25rem] px-8 text-xl font-black italic tracking-[0.2em] shadow-inner"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  {verificationSubStep === 'enterPan' && (
                    <Button
                      type="button"
                      onClick={handleVerifyPan}
                      disabled={isLoading || field.value?.length !== 10}
                      className="h-16 px-8 rounded-[1.25rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.3em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyPan')}
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="pt-12 flex gap-4">
        <Button variant="outline" onClick={() => setCurrentStep('contact')} className="h-16 flex-1 rounded-[1.5rem] border-white/10 font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-background/5 transition-colors">{tAuth('back')}</Button>
        <Button variant="ghost" onClick={() => setCurrentStep('photo')} className="h-16 flex-1 rounded-[1.5rem] text-primary/70 hover:text-primary font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-primary/10 transition-colors">Skip for Now</Button>
      </div>
    </motion.div>
  );
}
