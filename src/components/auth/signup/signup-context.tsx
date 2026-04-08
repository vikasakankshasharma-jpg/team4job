// src/components/auth/signup/signup-context.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";

export const addressSchema = z.object({
  house: z.string().min(1, "House/Flat No. is required."),
  street: z.string().min(3, "Street/Area is required."),
  landmark: z.string().optional(),
  cityPincode: z.string().optional(),
  fullAddress: z.string().optional(),
});

export const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["Client", "Professional"]).optional(),
  mobile: z.string().regex(/^\d{10}$/, { message: "Must be a 10-digit mobile number." }),
  address: addressSchema,
  aadhar: z.string().optional(),
  pan: z.string().optional(),
  otp: z.string().optional(),
  realAvatarUrl: z.string().optional(),
  kycAddress: z.string().optional(),
  skills: z.array(z.string()).optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions" }),
  }).optional(),
  fax: z.string().optional(), // Honeypot field
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignUpFormValues = z.infer<typeof formSchema>;

export type StepList = "role" | "contact" | "verification" | "photo" | "skills" | "details";

interface SignupContextType {
  currentStep: StepList;
  setCurrentStep: (step: StepList) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  // Verification states
  isMobileVerified: boolean;
  setIsMobileVerified: (val: boolean) => void;
  isEmailVerified: boolean;
  setIsEmailVerified: (val: boolean) => void;
  verificationSubStep: "enterAadhar" | "enterOtp" | "enterPan" | "verified";
  setVerificationSubStep: (val: "enterAadhar" | "enterOtp" | "enterPan" | "verified") => void;
  verificationId: string;
  setVerificationId: (id: string) => void;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  verifiedCredential: any;
  setVerifiedCredential: (cred: any) => void;
}

const SignupContext = createContext<SignupContextType | null>(null);

export const SignupProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState<StepList>("role");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationSubStep, setVerificationSubStep] = useState<"enterAadhar" | "enterOtp" | "enterPan" | "verified">("enterAadhar");
  const [verificationId, setVerificationId] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [verifiedCredential, setVerifiedCredential] = useState<any>(null);

  return (
    <SignupContext.Provider
      value={{
        currentStep, setCurrentStep,
        isLoading, setIsLoading,
        isMobileVerified, setIsMobileVerified,
        isEmailVerified, setIsEmailVerified,
        verificationSubStep, setVerificationSubStep,
        verificationId, setVerificationId,
        photo, setPhoto,
        verifiedCredential, setVerifiedCredential
      }}
    >
      {children}
    </SignupContext.Provider>
  );
};

export const useSignupContext = () => {
  const context = useContext(SignupContext);
  if (!context) {
    throw new Error("useSignupContext must be used within a SignupProvider");
  }
  return context;
};
