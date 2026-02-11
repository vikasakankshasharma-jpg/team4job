

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
import {
  initiateAadharVerificationAction,
  confirmAadharVerificationAction,
  verifyGstAction
} from "@/app/actions/ai.actions";
import { useRouter } from "next/navigation";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useHelp } from "@/hooks/use-help";
import { allSkills } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@/lib/types";
import { useTranslations } from "next-intl";

type VerificationStep = "enterAadhar" | "enterOtp" | "selectSkills" | "enterBusinessProof" | "verified";

export default function VerifyInstallerClient() {
  const { toast } = useToast();
  const tError = useTranslations('errors');
  const t = useTranslations('admin.verifyInstaller');
  const { user, setUser, setRole, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<VerificationStep>("enterAadhar");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setHelp } = useHelp();

  // Zod schemas moved inside to use translations
  const aadharSchema = z.object({
    aadharNumber: z.string().length(12, { message: t('steps.aadhar.validation') }),
  });

  const otpSchema = z.object({
    otp: z.string().length(6, { message: t('steps.otp.validation') }),
  });

  const skillsSchema = z.object({
    skills: z.array(z.string()).min(1, { message: t('steps.skills.validation') }),
  });

  const businessSchema = z.object({
    shopPhotoUrl: z.string().optional(),
    gstNumber: z.string().optional(),
  });

  useEffect(() => {
    setHelp({
      title: t('help.title'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('help.contentIntro')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('help.itemAadhar')}</span> {t('help.itemAadharDesc')}</li>
            <li><span className="font-semibold">{t('help.itemSkills')}</span> {t('help.itemSkillsDesc')}</li>
          </ul>
          <p>{t('help.contentOutro')}</p>
        </div>
      )
    });
  }, [setHelp, t]);

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
      const result = await initiateAadharVerificationAction(values);
      if (result.success && result.data) {
        setVerificationId(result.data.verificationId);
        setStep("enterOtp");
        toast({ title: t('alerts.otpSent'), description: result.data.message });
      } else {
        const errorMsg = tError(result.error || 'serverError') || t('alerts.failedToInitiate');
        setError(errorMsg);
        toast({ title: t('alerts.error'), description: errorMsg, variant: "destructive" });
      }
    } catch (e: any) {
      setError(tError(e.message) || t('alerts.unexpectedError'));
      toast({ title: t('alerts.error'), description: tError(e.message) || t('alerts.unexpectedError'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    if (!verificationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await confirmAadharVerificationAction({ ...values, verificationId });
      if (result.success && result.data && result.data.isVerified) {
        setStep("selectSkills");
        toast({ title: t('alerts.verificationSuccess'), description: t('alerts.verificationSuccessDesc'), variant: "default" });
      } else {
        const errorMsg = result.data?.message || tError(result.error || 'serverError') || t('alerts.verificationFailed');
        setError(errorMsg);
        toast({ title: t('alerts.verificationFailed'), description: errorMsg, variant: "destructive" });
      }
    } catch (e: any) {
      setError(e.message || t('alerts.unexpectedError'));
      toast({ title: t('alerts.error'), description: tError(e.message) || t('alerts.unexpectedError'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSkillsSubmit(values: z.infer<typeof skillsSchema>) {
    setIsLoading(true);
    try {
      toast({ title: t('alerts.skillsSaved'), description: t('alerts.skillsSavedDesc'), variant: "default" });
      setStep("enterBusinessProof");
    } catch (error) {
      console.error("Error saving skills:", error);
      toast({ title: t('alerts.error'), description: t('alerts.updateError'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const businessForm = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: { shopPhotoUrl: "", gstNumber: "" },
  });

  async function onBusinessSubmit(values: z.infer<typeof businessSchema>) {
    if (!user || !db) return;
    setIsLoading(true);
    try {
      if (values.gstNumber && process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true') {
        try {
          const result = await verifyGstAction({ gstin: values.gstNumber });
          if (!result.success || !result.data?.isValid) {
            const errorMsg = result.data?.message || tError(result.error || 'serverError') || t('alerts.gstCheckError');
            toast({ title: t('alerts.verificationFailed'), description: errorMsg, variant: "destructive" });
            setIsLoading(false);
            return;
          }
          toast({ title: t('alerts.gstVerified'), description: `Business: ${result.data.legalName || 'Verified'}` });
        } catch (e) {
          console.error("GST Check Error", e);
          // Block if API enabled and failed
          toast({ title: t('alerts.error'), description: t('alerts.gstCheckError'), variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      const userRef = doc(db, 'users', user.id);
      const isPro = !!(values.shopPhotoUrl || values.gstNumber);

      const updateData = {
        roles: arrayUnion('Installer'),
        installerProfile: {
          tier: isPro ? ('Silver' as const) : ('Bronze' as const),
          points: isPro ? 100 : 50, // Give 50 starting points to freelancers to help them get started
          skills: skillsForm.getValues().skills,
          rating: 0,
          reviews: 0,
          verified: process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true', // True if automated, False if manual
          verificationLevel: isPro ? ('Pro' as const) : ('Basic' as const),
          shopPhotoUrl: values.shopPhotoUrl || null,
          gstNumber: values.gstNumber || null,
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

      const isAutomated = process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true';
      toast({
        title: isAutomated ? t('alerts.profileActivated') : t('alerts.profileSubmitted'),
        description: isAutomated
          ? t('alerts.profileActivatedDesc')
          : t('alerts.profileSubmittedDesc'),
        variant: "default"
      });
      router.push('/dashboard/profile');
    } catch (error) {
      console.error("Error finalizing installer profile:", error);
      toast({ title: t('alerts.error'), description: t('alerts.updateError'), variant: "destructive" });
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
          <CardTitle className="flex items-center gap-2"><ShieldCheck /> {t('title')}</CardTitle>
          <CardDescription>
            {step === 'enterAadhar' && t('description.enterAadhar')}
            {step === 'enterOtp' && t('description.enterOtp')}
            {step === 'selectSkills' && t('description.selectSkills')}
            {step === 'enterBusinessProof' && t('description.enterBusinessProof')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{t('alerts.error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}


          {step === "enterAadhar" && (
            <Form {...aadharForm}>
              <form onSubmit={aadharForm.handleSubmit(async (values) => {
                const isAutomated = process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true';
                setIsLoading(true);
                setError(null);

                if (isAutomated) {
                  try {
                    const result = await initiateAadharVerificationAction(values);
                    if (result.success && result.data) {
                      setVerificationId(result.data.verificationId);
                      setStep("enterOtp");
                      toast({ title: t('alerts.otpSent'), description: result.data.message });
                    } else {
                      const errorMsg = tError(result.error || 'serverError') || t('alerts.failedToInitiate');
                      setError(errorMsg);
                      toast({ title: t('alerts.error'), description: errorMsg, variant: "destructive" });
                    }
                  } catch (e: any) {
                    setError(tError(e.message) || t('alerts.unexpectedError'));
                    toast({ title: t('alerts.error'), description: tError(e.message), variant: "destructive" });
                  } finally {
                    setIsLoading(false);
                  }
                } else {
                  // Manual Mode
                  setVerificationId(`MANUAL_${Date.now()}`);
                  setStep("enterOtp");
                  toast({ title: t('alerts.detailsRecorded'), description: t('alerts.detailsRecordedDesc') });
                  setIsLoading(false);
                }
              })} className="space-y-8">
                <FormField
                  control={aadharForm.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('steps.aadhar.label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('steps.aadhar.placeholder')} {...field} />
                      </FormControl>
                      <FormDescription>
                        {process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true'
                          ? t('steps.aadhar.helperTextApi')
                          : t('steps.aadhar.helperTextManual')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true' ? t('steps.aadhar.buttonApi') : t('steps.aadhar.buttonNext')}
                </Button>
              </form>
            </Form>
          )}

          {step === "enterOtp" && (
            process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true' ? (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('steps.otp.label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('steps.otp.placeholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('steps.otp.description')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('steps.otp.button')}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">{t('steps.otp.manualTitle')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('steps.otp.manualDesc')}
                  </p>
                </div>
                <Button onClick={() => {
                  setStep("selectSkills");
                  toast({ title: t('steps.otp.manualToastTitle'), description: t('steps.otp.manualToastDesc') });
                }} className="w-full">
                  {t('steps.otp.manualButton')}
                </Button>
              </div>
            )
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
                        <h3 className="font-medium">{t('steps.skills.title')}</h3>
                        <p className="text-sm text-muted-foreground">{t('steps.skills.subtitle')}</p>
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
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('steps.skills.button')}
                </Button>
              </form>
            </Form>
          )}

          {step === "enterBusinessProof" && (
            <Form {...businessForm}>
              <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-8">
                <FormField
                  control={businessForm.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('steps.business.gstLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('steps.business.gstPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="shopPhotoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('steps.business.photoLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('steps.business.photoPlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>{t('steps.business.photoHelper')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('steps.business.buttonFinish')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onBusinessSubmit({})}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {t('steps.business.buttonSkip')}
                  </Button>
                </div>
              </form>
            </Form>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
