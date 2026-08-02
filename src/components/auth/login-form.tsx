
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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

type FormValues = {
  identifier: string;
  password: string;
};

const MAX_LOGIN_ATTEMPTS =
  (typeof window !== 'undefined' && window.location.hostname === 'localhost') || process.env.NEXT_PUBLIC_E2E === 'true'
    ? 50
    : 5;
const LOCKOUT_DURATION_SECONDS = 60;

export function LoginForm() {
  const router = useRouter();
  const { login, user } = useUser();
  const { toast } = useToast();
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

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

  const formSchema = useMemo(() => z.object({
    identifier: z.string().refine((val) => {
      const isEmail = z.string().email().safeParse(val).success;
      const isMobile = /^\d{10}$/.test(val);
      return isEmail || isMobile;
    }, { message: t("validation.identifierReq") }),
    password: z.string().min(1, { message: t("validation.passwordReq") }),
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (lockoutUntil) return;

    setIsLoading(true);
    // basic demo check - still useful if user types dummy email
    const isDemoUser = values.identifier.endsWith("@example.com");
    const success = await login(values.identifier, values.password);

    if (success) {
      // A small delay to allow user context to update before redirect
      setTimeout(() => {
        const isFirstLogin = !user?.lastLoginAt; // This is a simplified check
        if (isDemoUser || isFirstLogin) {
          router.push("/dashboard?tour=true");
        } else {
          router.push("/dashboard");
        }
      }, 500);
    } else {
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
    }
  }

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
                   aria-label={t('emailMobileLabel')} 
                   data-testid="login-identifier" 
                />
              </FormControl>
              <FormMessage data-testid="email-error" className="ml-4 font-black italic uppercase text-[10px] tracking-widest" />
            </FormItem>
          )}
        />
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
                    aria-label={t('passwordLabel')}
                    data-testid="login-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full hover:bg-primary/10 transition-colors z-10 text-muted-foreground hover:text-primary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Eye className="h-6 w-6" aria-hidden="true" />
                    )}
                    <span className="sr-only">{showPassword ? t('hidePassword') : t('showPassword')}</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage data-testid="password-error" className="ml-4 font-black italic uppercase text-[10px] tracking-widest" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-20 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all mt-6" disabled={isLoading || !!lockoutUntil} data-testid="login-submit-btn">
          {isLoading && <Loader2 className="mr-4 h-6 w-6 animate-spin" />}
          {t('loginSubmit') || 'AUTHORIZE ACCESS'}
        </Button>
      </form>
    </Form>
  );
}
