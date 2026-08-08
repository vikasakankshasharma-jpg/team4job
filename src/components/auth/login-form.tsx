"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ShieldCheck, Mail, Smartphone } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { OtpInput } from "@/components/ui/otp-input";
import { signInWithPhoneNumber, RecaptchaVerifier, getAuth, Auth, signInWithCustomToken } from "firebase/auth";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { useFirebase } from "@/infrastructure/firebase/client-provider";

type FormValues = {
  identifier: string;
  password?: string;
};

const MAX_LOGIN_ATTEMPTS =
  (typeof window !== 'undefined' && window.location.hostname === 'localhost') || process.env.NEXT_PUBLIC_E2E === 'true'
    ? 50
    : 5;
const LOCKOUT_DURATION_SECONDS = 60;

export function LoginForm() {
  const router = useRouter();
  const { login, user, setRoleState } = useUser();
  const { app: mainApp } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  const [otpMethod, setOtpMethod] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const tempAuthRef = useRef<Auth | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutUntil) {
      const updateRemainingTime = () => {
        const now = new Date();
        const timeLeft = Math.max(0, Math.ceil((lockoutUntil.getTime() - now.getTime()) / 1000));
        setRemainingTime(timeLeft);
        if (timeLeft === 0) {
          setLockoutUntil(null);
          setLoginAttempts(0);
          clearInterval(interval);
        }
      };
      updateRemainingTime();
      interval = setInterval(updateRemainingTime, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

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
            size: "invisible",
            callback: () => {},
          });
        }
      } catch (e: any) {
        console.error('[Login] Failed to initialize reCAPTCHA:', e.message);
      }
    }
  }, [mainApp]);

  const formSchema = useMemo(() => z.object({
    identifier: z.string().refine((val) => {
      const isEmail = z.string().email().safeParse(val).success;
      const isMobile = /^\d{10}$/.test(val);
      return isEmail || isMobile;
    }, { message: t("validation.identifierReq") }),
    password: z.string().optional(),
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const identifierVal = form.watch("identifier");
  const isEmail = z.string().email().safeParse(identifierVal).success;
  const isMobile = /^\d{10}$/.test(identifierVal);

  const handlePostLogin = (isDemoUser: boolean) => {
    setTimeout(() => {
      const isFirstLogin = !user?.lastLoginAt;
      if (isDemoUser || isFirstLogin) {
        router.push("/dashboard?tour=true");
      } else {
        router.push("/dashboard");
      }
    }, 500);
  };

  const handleFailedAttempt = () => {
    const newAttemptCount = loginAttempts + 1;
    setLoginAttempts(newAttemptCount);

    if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
      const newLockoutUntil = new Date(new Date().getTime() + LOCKOUT_DURATION_SECONDS * 1000);
      setLockoutUntil(newLockoutUntil);
      toast({
        title: t('tooManyAttempts'),
        description: t('lockoutDescription', { seconds: LOCKOUT_DURATION_SECONDS }),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('loginFailed'),
        description: t('invalidCredentials', { count: MAX_LOGIN_ATTEMPTS - newAttemptCount }),
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  async function onSubmit(values: FormValues) {
    if (lockoutUntil) return;
    if (loginMode === 'otp') return; // OTP is handled separately

    setIsLoading(true);
    const isDemoUser = values.identifier.endsWith("@example.com");
    const success = await login(values.identifier, values.password);

    if (success) {
      handlePostLogin(isDemoUser);
    } else {
      handleFailedAttempt();
    }
  }

  const handleSendOtp = async (method: 'email' | 'sms' | 'whatsapp') => {
    if (lockoutUntil) return;
    setIsLoading(true);
    setOtpMethod(method);

    try {
      if (method === 'sms') {
        const authInstance = tempAuthRef.current;
        if (!authInstance || !recaptchaVerifierRef.current) throw new Error("Auth not initialized");

        const formattedNumber = `+91${identifierVal}`;
        const confirmation = await signInWithPhoneNumber(authInstance, formattedNumber, recaptchaVerifierRef.current);
        // @ts-ignore
        window.confirmationResult = confirmation;
        setOtpStep('verify');
        toast({ title: t('otpSent'), description: "Check your SMS." });
      } else if (method === 'whatsapp') {
        const res = await fetch('/api/auth/whatsapp-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: identifierVal, action: 'send', intent: 'login' })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setOtpStep('verify');
        toast({ title: t('otpSent'), description: "Check your WhatsApp." });
      } else if (method === 'email') {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifierVal, action: 'send', intent: 'login' })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setOtpStep('verify');
        toast({ title: t('otpSent'), description: "Check your Email." });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      if (method === 'sms' && recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (lockoutUntil) return;
    setIsLoading(true);

    try {
      if (otpMethod === 'sms') {
        // @ts-ignore
        const confirmation = window.confirmationResult;
        if (!confirmation) throw new Error("No session");
        
        await confirmation.confirm(otpCode);
        
        // SMS logs in via Firebase Phone Auth natively. 
        handlePostLogin(false);

      } else if (otpMethod === 'whatsapp' || otpMethod === 'email') {
        const endpoint = otpMethod === 'whatsapp' ? '/api/auth/whatsapp-otp' : '/api/auth/verify-email';
        const payload = otpMethod === 'whatsapp' 
          ? { phone: identifierVal, action: 'verify', otp: otpCode, intent: 'login' }
          : { email: identifierVal, action: 'verify', otp: otpCode, intent: 'login' };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        // Sign in with custom token
        const auth = getAuth(mainApp);
        await signInWithCustomToken(auth, data.token);
        handlePostLogin(false);
      }
    } catch (e: any) {
      handleFailedAttempt();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} method="POST" className="space-y-6" noValidate>
        {lockoutUntil && (
          <Alert variant="destructive">
            <AlertTitle>{t('loginLocked')}</AlertTitle>
            <AlertDescription>
              {t('lockoutDescription', { seconds: remainingTime })}
            </AlertDescription>
          </Alert>
        )}
        
        <div id="recaptcha-container"></div>

        {otpStep === 'input' && (
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">{t('emailMobileLabel')}</FormLabel>
                <FormControl>
                  <Input 
                     placeholder={t('emailMobilePlaceholder')} 
                     {...field} 
                     disabled={!!lockoutUntil} 
                     className="h-20 rounded-[1.5rem] bg-surface-container-low/40 dark:bg-slate-900/60 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all px-8 font-black text-lg italic tracking-tight text-foreground" 
                     autoComplete="off" 
                     data-testid="login-identifier"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {loginMode === 'password' && otpStep === 'input' && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">{t('passwordLabel')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t('passwordPlaceholder')}
                      {...field}
                      disabled={!!lockoutUntil}
                      className="h-20 rounded-[1.5rem] bg-surface-container-low/40 dark:bg-slate-900/60 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all px-8 pr-20 font-black text-lg italic tracking-tight text-foreground"
                      autoComplete="new-password"
                      data-testid="login-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full hover:bg-primary/10 transition-colors z-10 text-muted-foreground hover:text-primary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {loginMode === 'otp' && otpStep === 'input' && (
          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-black italic uppercase tracking-[0.2em] text-center opacity-50">Select OTP Method</p>
            <div className="flex flex-col gap-2">
              {isEmail && (
                <Button 
                  type="button" 
                  onClick={() => handleSendOtp('email')} 
                  disabled={isLoading || !!lockoutUntil} 
                  className="h-16 rounded-[1.25rem] bg-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.2em] italic hover:scale-105 active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP via Email'}
                </Button>
              )}
              {isMobile && (
                <>
                  <Button 
                    type="button" 
                    onClick={() => handleSendOtp('sms')} 
                    disabled={isLoading || !!lockoutUntil} 
                    className="h-16 rounded-[1.25rem] bg-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.2em] italic hover:scale-105 active:scale-95 transition-all"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP via SMS'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleSendOtp('whatsapp')} 
                    disabled={isLoading || !!lockoutUntil} 
                    className="h-16 rounded-[1.25rem] bg-green-500/20 text-green-500 border border-green-500/50 font-black text-[10px] uppercase tracking-[0.2em] italic hover:scale-105 active:scale-95 transition-all"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP via WhatsApp'}
                  </Button>
                </>
              )}
              {!isEmail && !isMobile && (
                 <p className="text-xs text-center text-muted-foreground italic">Please enter a valid email or 10-digit mobile number above to send an OTP.</p>
              )}
            </div>
          </div>
        )}

        {loginMode === 'otp' && otpStep === 'verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-[10px] font-black italic uppercase tracking-[0.3em] text-primary">Enter Verification Code</span>
            </div>
            <div className="flex justify-center">
              <OtpInput 
                value={otpCode}
                onChange={setOtpCode}
                length={6}
              />
            </div>
            <Button 
              type="button" 
              onClick={handleVerifyOtp} 
              disabled={isLoading || otpCode.length !== 6 || !!lockoutUntil}
              className="w-full h-20 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isLoading ? <Loader2 className="mr-4 h-6 w-6 animate-spin" /> : 'VERIFY & LOGIN'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOtpStep('input'); setOtpCode(""); }}
              className="w-full h-12 text-[10px] font-black uppercase tracking-[0.2em] italic opacity-50"
            >
              Change Contact Method
            </Button>
          </div>
        )}

        {loginMode === 'password' && otpStep === 'input' && (
          <Button type="submit" className="w-full h-20 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all mt-6" disabled={isLoading || !!lockoutUntil}>
            {isLoading && <Loader2 className="mr-4 h-6 w-6 animate-spin" />}
            {t('loginSubmit') || 'AUTHORIZE ACCESS'}
          </Button>
        )}

        {otpStep === 'input' && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLoginMode(loginMode === 'password' ? 'otp' : 'password')}
            className="w-full h-12 text-[10px] font-black uppercase tracking-[0.2em] italic opacity-50 hover:opacity-100 transition-opacity"
          >
            {loginMode === 'password' ? 'Login with OTP instead' : 'Login with Password instead'}
          </Button>
        )}
      </form>
    </Form>
  );
}
