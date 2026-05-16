"use client";

import React, { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  linkWithCredential, 
  User as FirebaseUser 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { useToast } from "@/hooks/use-toast";
import { useFirebase, useFirestore } from "@/infrastructure/firebase/client-provider";
import { trackFunnelEvent } from "@/lib/analytics";
import { markSignupComplete } from "@/lib/signup-tracker";
import { User } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

import { 
  SignupProvider, 
  useSignupContext, 
  formSchema, 
  SignUpFormValues 
} from "./signup/signup-context";
import { StepRole } from "./signup/step-role";
import { StepContact } from "./signup/step-contact";
import { StepIdentity } from "./signup/step-identity";
import { StepPhoto } from "./signup/step-photo";
import { StepSkills } from "./signup/step-skills";
import { StepDetails } from "./signup/step-details";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SignUpMasterProps {
  isMapLoaded: boolean;
  referredBy?: string;
}

function SignUpController({ isMapLoaded, referredBy }: SignUpMasterProps) {
  const router = useRouter();
  const { auth } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();
  const tAuth = useTranslations('auth');

  const { 
    currentStep, 
    setCurrentStep,
    isLoading, 
    setIsLoading,
    isMobileVerified,
    isEmailVerified,
    verificationSubStep,
    photo,
    verifiedCredential
  } = useSignupContext();

  const methods = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      mobile: "",
      address: {
        house: "",
        street: "",
        landmark: "",
        cityPincode: "",
        fullAddress: "",
      },
      aadhar: "",
      pan: "",
      otp: "",
      realAvatarUrl: "",
      kycAddress: "",
      skills: [],
      termsAccepted: undefined,
    },
  });

  const { handleSubmit, watch, setError } = methods;
  const role = watch("role");

  // Step Progress Indicator
  const renderStepIndicator = () => {
    const isProfessional = role === 'Professional';
    
    const steps = [
      { id: 'role', label: tAuth('role') || 'Role' },
      { id: 'contact', label: tAuth('contact') || 'Contact' },
      { id: 'identity', label: tAuth('photo') || 'Identity', match: ['verification', 'photo'] },
      ...(isProfessional ? [{ id: 'skills', label: tAuth('skills') || 'Skills' }] : []),
      { id: 'details', label: tAuth('details') || 'Profile' }
    ];

    const currentStepId = steps.find(s => 
      s.id === currentStep || 
      (s.match && s.match.includes(currentStep)) ||
      (currentStep === 'contact' ? s.id === 'contact' : false)
    )?.id || 'role';

    const currentStepIndex = steps.findIndex(s => s.id === currentStepId);

    return (
      <div className="mb-16 w-full px-4">
        <div className="flex justify-between items-center relative gap-4">
          {/* Progress Line */}
          <div className="absolute top-[22px] left-0 w-full h-[3px] bg-muted/20 -z-10 rounded-full" />
          <div 
            className="absolute top-[22px] left-0 h-[3px] bg-primary shadow-[0_0_20px_rgba(var(--primary),0.6)] -z-10 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-full"
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <div key={step.id} className="flex flex-col items-center gap-4 group cursor-default">
                <div 
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border-2 z-10 text-white font-black text-sm transition-all duration-700 shadow-2xl",
                    isActive ? "scale-150 ring-8 ring-primary/10 bg-primary border-primary rotate-[360deg]" : 
                    isCompleted ? "bg-primary border-primary" : "bg-muted border-border"
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : idx + 1}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 italic",
                  isActive ? "text-primary translate-y-2" : "text-muted-foreground/40"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);

    if (!auth || !db) {
      toast({ title: "Error", description: "Firebase not initialized. Please try again.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (values.fax) {
      // Honeypot trap triggered - simulate success but do nothing
      setIsLoading(false);
      return;
    }

    if (values.role === 'Professional' && verificationSubStep !== 'verified') {
      setCurrentStep("verification");
      setError("aadhar", { type: "manual", message: "Please complete Aadhar verification." });
      setIsLoading(false);
      return;
    }
    
    if (!photo) {
      setCurrentStep("photo");
      setError("realAvatarUrl", { type: "manual", message: "Please add a profile photo." });
      setIsLoading(false);
      return;
    }

    try {
      if (!isMobileVerified) throw new Error("Please verify your mobile number.");
      if (!isEmailVerified) throw new Error("Please verify your email address.");

      // Step 1: Create user with email/password FIRST
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser: FirebaseUser = userCredential.user;

      // Step 2: Link phone credential to the newly created user
      if (verifiedCredential) {
        try {
          await linkWithCredential(firebaseUser, verifiedCredential);
        } catch (linkError: any) {
          if (linkError.code !== 'auth/credential-already-associated') {
            toast({ title: "Link Warning", description: "Mobile could not be linked to Auth account, but signup proceeded.", variant: "default" });
          }
        }
      }

      // Update Profile Name immediately
      await updateProfile(firebaseUser, { displayName: values.name, photoURL: values.realAvatarUrl || PlaceHolderImages[0].imageUrl });

      // Build User Object
      const userRoleDef = values.role || 'Client';
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 30); // Default 30 days trial

      const newUser: Omit<User, 'id'> = {
        name: values.name,
        email: values.email.toLowerCase(),
        mobile: values.mobile,
        isMobileVerified: true,
        isEmailVerified: true,
        roles: [userRoleDef],
        memberSince: new Date() as any, // Firebase Timestamp handled later
        status: 'active',
        avatarUrl: values.realAvatarUrl || PlaceHolderImages[0].imageUrl,
        realAvatarUrl: values.realAvatarUrl,
        pincodes: { residential: values.address.cityPincode?.split(',')[0].trim() || '' },
        address: {
          ...values.address,
          cityPincode: values.address.cityPincode || '',
        },
        addresses: {
          residence: {
            ...values.address,
            cityPincode: values.address.cityPincode || '',
          },
        },
        subscription: {
          planId: 'trial',
          planName: 'Free Trial',
          expiresAt: trialExpiry as any,
        },
        referredBy: referredBy || "",
      };

      if (userRoleDef === 'Professional') {
        if (values.aadhar) {
          newUser.aadharLast4 = values.aadhar.slice(-4);
        }
        newUser.panNumber = values.pan;
        newUser.kycAddress = values.kycAddress;
        newUser.isPanVerified = true; 
        newUser.professionalProfile = {
          tier: 'Bronze',
          points: 0,
          skills: values.skills || [],
          rating: 0,
          reviews: 0,
          verified: true, 
          reputationHistory: []
        };
      }

      const userDocRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userDocRef, { ...newUser, id: firebaseUser.uid });

      try {
        await markSignupComplete(db, values.mobile, firebaseUser.uid);
        trackFunnelEvent('signup_completed', { role: userRoleDef });
      } catch (trackError) {}

      router.push("/dashboard");

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError("email", { type: "manual", message: "This email is already registered." });
      } else {
        toast({ title: "Sign Up Failed", description: error.message || "An unexpected error occurred", variant: "destructive" });
      }
      setCurrentStep("details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full">
        {renderStepIndicator()}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === "role" && <StepRole key="role" />}
            {currentStep === "contact" && <StepContact key="contact" />}
            {currentStep === "verification" && <StepIdentity key="identity" />}
            {currentStep === "photo" && <StepPhoto key="photo" />}
            {currentStep === "skills" && <StepSkills key="skills" />}
            {currentStep === "details" && <StepDetails key="details" isMapLoaded={isMapLoaded} />}
          </AnimatePresence>
        </div>
      </form>
    </FormProvider>
  );
}

export function SignUpForm({ isMapLoaded, referredBy }: SignUpMasterProps) {
  useEffect(() => {
    trackFunnelEvent('signup_started');
  }, []);

  return (
    <SignupProvider>
      <SignUpController isMapLoaded={isMapLoaded} referredBy={referredBy} />
    </SignupProvider>
  );
}
