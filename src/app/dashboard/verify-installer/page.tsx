
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { ShieldCheck, Loader2 } from "lucide-react";
import { initiateAadharVerification, confirmAadharVerification } from "@/ai/flows/aadhar-verification";
import { useRouter } from "next/navigation";

const aadharSchema = z.object({
  aadharNumber: z.string().length(12, { message: "Aadhar number must be 12 digits." }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});

export default function VerifyInstallerPage() {
  const { toast } = useToast();
  const { user, setUser } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const aadharForm = useForm<z.infer<typeof aadharSchema>>({
    resolver: zodResolver(aadharSchema),
    defaultValues: { aadharNumber: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  async function onAadharSubmit(values: z.infer<typeof aadharSchema>) {
    setIsLoading(true);
    try {
      const result = await initiateAadharVerification(values);
      if (result.success) {
        setTransactionId(result.transactionId);
        toast({ title: "OTP Sent", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    if (!transactionId) return;
    setIsLoading(true);
    try {
      const result = await confirmAadharVerification({ ...values, transactionId });
      if (result.isVerified) {
        toast({ title: "Verification Successful", description: result.message });
        // Update user context
        if (user && user.installerProfile) {
          const updatedUser = { ...user, installerProfile: { ...user.installerProfile, verified: true } };
          setUser(updatedUser);
        }
        router.push("/dashboard");
      } else {
        toast({ title: "Verification Failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck /> Installer Verification</CardTitle>
          <CardDescription>
            {transactionId
              ? "Enter the OTP sent to your Aadhar-linked mobile number."
              : "Verify your identity using Aadhar to become a trusted installer."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!transactionId ? (
            <Form {...aadharForm}>
              <form onSubmit={aadharForm.handleSubmit(onAadharSubmit)} className="space-y-8">
                <FormField
                  control={aadharForm.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your 12-digit Aadhar number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send OTP
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>One-Time Password (OTP)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the 6-digit OTP" {...field} />
                      </FormControl>
                      <FormDescription>For testing, use OTP: 123456</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
