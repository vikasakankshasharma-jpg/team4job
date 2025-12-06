

"use client";

import { useState, useEffect } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirebase } from "@/hooks/use-user";
import { ShieldCheck, Loader2 } from "lucide-react";
import { initiateAadharVerification, confirmAadharVerification } from "@/ai/flows/aadhar-verification";
import { useRouter } from "next/navigation";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useHelp } from "@/hooks/use-help";
import { allSkills } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@/lib/types";

const aadharSchema = z.object({
  aadharNumber: z.string().length(12, { message: "Aadhar number must be 12 digits." }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});

const skillsSchema = z.object({
  skills: z.array(z.string()).min(1, { message: "Please select at least one skill." }),
});

type VerificationStep = "enterAadhar" | "enterOtp" | "selectSkills" | "verified";

export default function VerifyInstallerPage() {
  const { toast } = useToast();
  const { user, setUser, setRole, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<VerificationStep>("enterAadhar");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setHelp } = useHelp();

  useEffect(() => {
    setHelp({
      title: "Become a Verified Installer",
      content: (
        <div className="space-y-4 text-sm">
          <p>This secure process verifies your identity and adds the "Installer" role to your profile.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Aadhar OTP:</span> First, enter your 12-digit Aadhar number. You'll receive an OTP on your linked mobile. For testing purposes, use Aadhar number <strong className="text-primary">999999990019</strong> and OTP <strong className="text-primary">123456</strong>.</li>
            <li><span className="font-semibold">Select Skills:</span> After successful verification, choose the skills you specialize in. This is crucial for getting matched with the right jobs.</li>
          </ul>
          <p>Once completed, you'll be able to switch to your Installer role and start bidding on jobs.</p>
        </div>
      )
    });
  }, [setHelp]);

  const aadharForm = useForm<z.infer<typeof aadharSchema>>({
    resolver: zodResolver(aadharSchema),
    defaultValues: { aadharNumber: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const skillsForm = useForm<z.infer<typeof skillsSchema>>({
    resolver: zodResolver(skillsSchema),
    defaultValues: { skills: [] },
  });

  useEffect(() => {
    if (!userLoading && user?.roles.includes('Installer')) {
      router.push('/dashboard/profile');
    }
  }, [user, userLoading, router]);

  async function onAadharSubmit(values: z.infer<typeof aadharSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await initiateAadharVerification(values);
      if (result.success) {
        setVerificationId(result.verificationId);
        setStep("enterOtp");
        toast({ title: "OTP Sent", description: result.message });
      } else {
        setError(result.message);
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred. Please try again.");
      toast({ title: "Error", description: e.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    if (!verificationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await confirmAadharVerification({ ...values, verificationId });
      if (result.isVerified) {
        setStep("selectSkills");
        toast({ title: "Verification Successful", description: "Please select your skills to complete the process.", variant: "default" });
      } else {
        setError(result.message);
        toast({ title: "Verification Failed", description: result.message, variant: "destructive" });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred. Please try again.");
      toast({ title: "Error", description: e.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSkillsSubmit(values: z.infer<typeof skillsSchema>) {
    if (!user || !db) return;
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      const updateData = {
        roles: arrayUnion('Installer'),
        installerProfile: {
          tier: 'Bronze' as const,
          points: 0,
          skills: values.skills,
          rating: 0,
          reviews: 0,
          verified: true,
          reputationHistory: [],
        }
      };
      await updateDoc(userRef, updateData);

      if (setUser) {
        const updatedUser = {
          ...user,
          roles: [...user.roles, 'Installer'] as User['roles'],
          installerProfile: updateData.installerProfile
        };
        setUser(updatedUser);
      }
      if (setRole) {
        setRole('Installer');
      }

      toast({ title: "Installer Profile Activated!", description: "You can now find jobs and place bids.", variant: "default" });
      router.push('/dashboard/profile');
    } catch (error) {
      console.error("Error finalizing installer profile:", error);
      toast({ title: "Error", description: "Failed to create installer profile. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }


  if (userLoading || user?.roles.includes('Installer')) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck /> Become a Verified Installer</CardTitle>
          <CardDescription>
            {step === 'enterAadhar' && "Verify your identity using Aadhar to create an installer profile."}
            {step === 'enterOtp' && "An OTP has been sent to your Aadhar-linked mobile number. Enter it below."}
            {step === 'selectSkills' && "Verification complete! Now, select your skills to finish setting up your installer profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "enterAadhar" && (
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
                      <FormDescription>For testing, use Aadhar: <strong>999999990019</strong></FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send OTP
                </Button>
              </form>
            </Form>
          )}

          {step === "enterOtp" && (
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
                      <FormDescription>For testing, use OTP: <strong>123456</strong></FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify
                </Button>
              </form>
            </Form>
          )}

          {step === "selectSkills" && (
            <Form {...skillsForm}>
              <form onSubmit={skillsForm.handleSubmit(onSkillsSubmit)} className="space-y-8">
                <FormField
                  control={skillsForm.control}
                  name="skills"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <h3 className="font-medium">Select Your Skills</h3>
                        <p className="text-sm text-muted-foreground">Choose all that apply. This helps in matching you with the right jobs.</p>
                      </div>
                      <div className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
                        {allSkills.map((skill) => (
                          <FormField
                            key={skill}
                            control={skillsForm.control}
                            name="skills"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={skill}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(skill)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), skill])
                                          : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== skill
                                            )
                                          )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal capitalize cursor-pointer">
                                    {skill}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Finish Setup
                </Button>
              </form>
            </Form>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
