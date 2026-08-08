"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mail, Smartphone, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { signInWithPhoneNumber, RecaptchaVerifier, getAuth, Auth } from "firebase/auth";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { useFirebase, useFirestore } from "@/infrastructure/firebase/client-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";
import { useToast } from "@/hooks/use-toast";
import { trackSignupProgress } from "@/lib/signup-tracker";
import { useSignupContext, SignUpFormValues } from "./signup-context";

export function StepContact() {
  const { control, getValues, watch } = useFormContext<SignUpFormValues>();
  const { 
    setCurrentStep, 
    isLoading, setIsLoading,
    isMobileVerified, setIsMobileVerified,
    isEmailVerified, setIsEmailVerified,
    setVerifiedCredential
  } = useSignupContext();
  
  const { app: mainApp } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();
  const tAuth = useTranslations('auth');
  const role = watch("role");

  // Local state for OTP timers and UI
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [isMobileVerifying, setIsMobileVerifying] = useState(false);
  const [mobileVerificationMethod, setMobileVerificationMethod] = useState<'sms' | 'whatsapp' | null>(null);
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [mobileOtpError, setMobileOtpError] = useState<string | null>(null);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [mobileResendTimer, setMobileResendTimer] = useState(0);
  const [emailResendTimer, setEmailResendTimer] = useState(0);

  const tempAuthRef = useRef<Auth | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!tempAuthRef.current && mainApp) {
      try {
        const existingApps = getApps();
        let tempApp = existingApps.find((a: FirebaseApp) => a.name === 'temp-verify');
        if (!tempApp) {
          tempApp = initializeApp(mainApp.options, 'temp-verify');
        }
        tempAuthRef.current = getAuth(tempApp);

        if (tempAuthRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(tempAuthRef.current, "recaptcha-container", {
            size: "normal",
            callback: () => {},
          });
        }
      } catch (e: any) {
        console.error('[SignUp] Failed to initialize reCAPTCHA:', e.message);
        toast({ title: "Setup Error", description: "Could not setup phone verification.", variant: "destructive" });
      }
    }
  }, [mainApp, toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMobileResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setEmailResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMobileOtp = async (method: 'sms' | 'whatsapp') => {
    const mobile = getValues("mobile");
    if (!mobile || mobile.length !== 10) return;
    
    setIsLoading(true);
    setMobileVerificationMethod(method);
    
    try {
      if (method === 'sms') {
        const formattedNumber = `+91${mobile}`;
        const authInstance = tempAuthRef.current;
        if (!authInstance || !recaptchaVerifierRef.current) {
          toast({ title: "Error", description: "Verification not ready.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const confirmation = await signInWithPhoneNumber(authInstance, formattedNumber, recaptchaVerifierRef.current);
        // @ts-ignore
        window.confirmationResult = confirmation;
        setIsMobileVerifying(true);
        setMobileResendTimer(60);
        toast({ title: tAuth('otpSent'), description: "Please check your SMS." });
      } else {
        // WhatsApp
        const response = await fetch('/api/auth/whatsapp-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: mobile, action: 'send', intent: 'signup' })
        });
        const data = await response.json();
        if (data.success) {
          setIsMobileVerifying(true);
          setMobileResendTimer(60);
          toast({ title: tAuth('otpSent'), description: "Please check your WhatsApp." });
        } else {
          throw new Error(data.message);
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      if (method === 'sms' && recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length !== 6) {
      setMobileOtpError(tAuth('invalidOtp'));
      return;
    }
    setIsLoading(true);
    setMobileOtpError(null);
    try {
      if (mobileVerificationMethod === 'sms') {
        // @ts-ignore
        const confirmation = window.confirmationResult;
        if (!confirmation) throw new Error("No verification session found.");

        await confirmation.confirm(mobileOtp);
        const { PhoneAuthProvider } = await import('firebase/auth');
        const cred = PhoneAuthProvider.credential(confirmation.verificationId, mobileOtp);
        
        setVerifiedCredential(cred);
      } else {
        // WhatsApp verification
        const response = await fetch('/api/auth/whatsapp-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: getValues("mobile"), action: 'verify', otp: mobileOtp, intent: 'signup' })
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message);
        }
      }

      setIsMobileVerified(true);
      setIsMobileVerifying(false);
      setMobileOtp("");

      if (tempAuthRef.current) await tempAuthRef.current.signOut();

      try {
        if (db) {
          await trackSignupProgress(db, getValues("mobile"), 1, { attemptCount: 1 });
        }
      } catch (e) {}

      toast({ title: tAuth('mobileVerified'), className: "bg-green-100 border-green-500" });
    } catch (error: any) {
      setMobileOtpError(tAuth('invalidOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const email = getValues("email");
    if (!email || !email.includes("@")) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'send' })
      });
      const data = await response.json();
      if (data.success) {
        setIsEmailVerifying(true);
        setEmailResendTimer(60);
        toast({ title: tAuth('otpSent'), description: "Please check your email." });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      setEmailOtpError(tAuth('invalidOtp'));
      return;
    }
    setIsLoading(true);
    setEmailOtpError(null);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: getValues("email"), otp: emailOtp, action: 'verify' })
      });
      const data = await response.json();
      if (data.success) {
        setIsEmailVerified(true);
        setIsEmailVerifying(false);
        setEmailOtp("");
        toast({ title: tAuth('emailVerified'), className: "bg-green-100 border-green-500" });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setEmailOtpError(tAuth('invalidOtp'));
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
          {tAuth('contactVerificationTitle') || "VERIFY SIGNAL"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
          {tAuth('contactVerificationSubtitle') || "Authorization required for channel entry"}
        </p>
      </div>

      <div id="recaptcha-container"></div>

      <div className="space-y-6">
        <FormField
          control={control}
          name="mobile"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">
                <Smartphone className="h-4 w-4 inline-block mr-2" /> {tAuth('mobileNumber')}
              </FormLabel>
              <FormControl>
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex gap-4">
                    <Input
                      placeholder={tAuth('mobilePlaceholder')}
                      {...field}
                      disabled={isMobileVerified || isLoading || isMobileVerifying}
                      className="h-16 flex-1 bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all rounded-[1.25rem] px-6 font-black text-lg italic tracking-tighter"
                      autoComplete="tel"
                    />
                      {!isMobileVerified && !isMobileVerifying && (
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            onClick={() => handleSendMobileOtp('sms')} 
                            disabled={isLoading || !field.value || field.value.length !== 10} 
                            className="h-16 px-6 rounded-[1.25rem] bg-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.2em] italic hover:scale-105 active:scale-95 transition-all"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SMS'}
                          </Button>
                          <Button 
                            type="button" 
                            onClick={() => handleSendMobileOtp('whatsapp')} 
                            disabled={isLoading || !field.value || field.value.length !== 10} 
                            className="h-16 px-6 rounded-[1.25rem] bg-green-500/20 text-green-500 border border-green-500/50 font-black text-[10px] uppercase tracking-[0.2em] italic hover:scale-105 active:scale-95 transition-all"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'WhatsApp'}
                          </Button>
                        </div>
                      )}
                      {isMobileVerified && (
                        <div className="h-16 px-8 rounded-[1.25rem] bg-success/20 text-success flex items-center gap-3 border-none ring-1 ring-success/30 backdrop-blur-md">
                          <ShieldCheck className="h-6 w-6" />
                          <span className="font-black text-[10px] uppercase tracking-[0.3em] italic">{tAuth('verified')}</span>
                        </div>
                      )}
                  </div>

                    {isMobileVerifying && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-surface-container-low/60 border-none ring-1 ring-primary/20 space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.1)] backdrop-blur-3xl"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black italic uppercase tracking-[0.3em] text-primary">{tAuth('enterMobileOtp') || "ENTRY CODE"}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsMobileVerifying(false)}
                            className="h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            {tAuth('change')}
                          </Button>
                        </div>
                        <div className="flex justify-center">
                          <OtpInput 
                            value={mobileOtp}
                            onChange={setMobileOtp}
                            length={6}
                          />
                        </div>
                        {mobileOtpError && <p className="text-[10px] font-black italic uppercase tracking-widest text-destructive text-center">{mobileOtpError}</p>}
                        <div className="flex gap-4">
                          <Button 
                            onClick={handleVerifyMobileOtp} 
                            disabled={isLoading || mobileOtp.length !== 6}
                            className="flex-1 h-16 rounded-[1.25rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.3em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyOtp')}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => mobileVerificationMethod && handleSendMobileOtp(mobileVerificationMethod)} 
                            disabled={isLoading || mobileResendTimer > 0}
                            className="h-16 px-8 rounded-[1.25rem] border-white/10 font-black text-[10px] uppercase tracking-[0.2em] italic hover:bg-background/5 transition-colors"
                          >
                            {mobileResendTimer > 0 ? tAuth('resendIn', { seconds: mobileResendTimer }) : tAuth('resend')}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">
                <Mail className="h-4 w-4 inline-block mr-2" /> {tAuth('email')}
              </FormLabel>
              <FormControl>
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex gap-4">
                    <Input 
                      placeholder="name@example.com" 
                      {...field} 
                      disabled={isEmailVerified || isLoading || isEmailVerifying} 
                      className="h-16 flex-1 bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all rounded-[1.25rem] px-6 font-black text-lg italic tracking-tighter"
                      autoComplete="email"
                    />
                      {!isEmailVerified && !isEmailVerifying && (
                        <Button 
                          type="button" 
                          onClick={handleSendEmailOtp} 
                          disabled={isLoading || !field.value || !field.value.includes('@')} 
                          className="h-16 px-8 rounded-[1.25rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.3em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('sendOtp')}
                        </Button>
                      )}
                      {isEmailVerified && (
                        <div className="h-16 px-8 rounded-[1.25rem] bg-success/20 text-success flex items-center gap-3 border-none ring-1 ring-success/30 backdrop-blur-md">
                          <ShieldCheck className="h-6 w-6" />
                          <span className="font-black text-[10px] uppercase tracking-[0.3em] italic">{tAuth('verified')}</span>
                        </div>
                      )}
                  </div>

                    {isEmailVerifying && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-surface-container-low/60 border-none ring-1 ring-primary/20 space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.1)] backdrop-blur-3xl"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black italic uppercase tracking-[0.3em] text-primary">{tAuth('enterEmailOtp') || "CREDENTIAL KEY"}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEmailVerifying(false)}
                            className="h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            {tAuth('change')}
                          </Button>
                        </div>
                        <div className="flex justify-center">
                          <OtpInput 
                            value={emailOtp}
                            onChange={setEmailOtp}
                            length={6}
                          />
                        </div>
                        {emailOtpError && <p className="text-[10px] font-black italic uppercase tracking-widest text-destructive text-center">{emailOtpError}</p>}
                        <div className="flex gap-4">
                          <Button 
                            onClick={handleVerifyEmailOtp} 
                            disabled={isLoading || emailOtp.length !== 6}
                            className="flex-1 h-16 rounded-[1.25rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.3em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyOtp')}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleSendEmailOtp} 
                            disabled={isLoading || emailResendTimer > 0}
                            className="h-16 px-8 rounded-[1.25rem] border-white/10 font-black text-[10px] uppercase tracking-[0.2em] italic hover:bg-background/5 transition-colors"
                          >
                            {emailResendTimer > 0 ? tAuth('resendIn', { seconds: emailResendTimer }) : tAuth('resend')}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-12 flex gap-6">
        <Button variant="outline" onClick={() => setCurrentStep('role')} className="h-16 flex-1 rounded-[1.5rem] border-white/10 font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-background/5 transition-colors">{tAuth('back')}</Button>
        <Button 
          type="button"
          onClick={() => {
              if (isMobileVerified && isEmailVerified) {
                  setCurrentStep(role === 'Professional' ? 'verification' : 'photo');
              }
          }}
          disabled={!isMobileVerified || !isEmailVerified}
          className="h-16 flex-[2] rounded-[1.5rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          {tAuth('next') || "NEXT PROTOCOL"}
          <ArrowRight className="ml-3 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
