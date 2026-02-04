
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
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  identifier: z.string().refine((val) => {
    const isEmail = z.string().email().safeParse(val).success;
    const isMobile = /^\d{10}$/.test(val);
    return isEmail || isMobile;
  }, { message: "Please enter a valid email address or 10-digit mobile number." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

const MAX_LOGIN_ATTEMPTS = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 10 : 5;
const LOCKOUT_DURATION_SECONDS = 60;

export function LoginForm() {
  const router = useRouter();
  const { login, user } = useUser();
  const { toast } = useToast();
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("LoginForm: onSubmit called", values.identifier);
    if (lockoutUntil) return;

    setIsLoading(true);
    // basic demo check - still useful if user types dummy email
    const isDemoUser = values.identifier.endsWith("@example.com");
    console.log("LoginForm: Calling login...");
    const success = await login(values.identifier, values.password);
    console.log("LoginForm: Login result:", success);

    if (success) {
      // A small delay to allow user context to update before redirect
      setTimeout(() => {
        console.log("LoginForm: Redirecting to dashboard...");
        const isFirstLogin = !user?.lastLoginAt; // This is a simplified check
        if (isDemoUser || isFirstLogin) {
          router.push("/dashboard?tour=true");
        } else {
          router.push("/dashboard");
        }
      }, 500);
    } else {
      console.log("LoginForm: Login failed");
      const newAttemptCount = loginAttempts + 1;
      setLoginAttempts(newAttemptCount);

      if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
        const newLockoutUntil = new Date(new Date().getTime() + LOCKOUT_DURATION_SECONDS * 1000);
        setLockoutUntil(newLockoutUntil);
        toast({
          title: "Too Many Failed Attempts",
          description: `For your security, login has been temporarily disabled. Please try again in ${LOCKOUT_DURATION_SECONDS} seconds.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: `Invalid credentials. You have ${MAX_LOGIN_ATTEMPTS - newAttemptCount} attempts remaining.`,
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {lockoutUntil && (
          <Alert variant="destructive">
            <AlertTitle>Login Locked</AlertTitle>
            <AlertDescription>
              Too many failed login attempts. Please try again in {remainingTime} seconds.
            </AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email or Mobile Number</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com or 9876543210" {...field} disabled={!!lockoutUntil} className="h-11" autoComplete="username" aria-label="Email or Mobile Number" />
              </FormControl>
              <FormMessage data-testid="email-error" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    disabled={!!lockoutUntil}
                    className="h-11 pr-12"
                    autoComplete="current-password"
                    aria-label="Password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent z-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage data-testid="password-error" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-11" disabled={isLoading || !!lockoutUntil} data-testid="login-submit-btn">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log In
        </Button>
      </form>
    </Form>
  );
}
