
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import NextImage from "next/image";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import React, { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Camera, Upload, Eye, EyeOff, AlertCircle, Smartphone, Mail, RefreshCcw, ArrowRight, Check, Briefcase, Search, Lock, MapPin, CreditCard, Fingerprint, User as LucideUser } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OtpInput } from "@/components/ui/otp-input";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { User, PlatformSettings } from "@/lib/types";
import { useTranslations } from "next-intl";
import {
  initiateAadharVerificationAction,
  confirmAadharVerificationAction,
  verifyPanAction
} from "@/app/actions/ai.actions";
import { type ConfirmAadharOutput } from "@/domains/ai/ai.types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddressForm } from "@/components/ui/address-form";
import { SkillsSelector } from "@/components/ui/skills-selector";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  linkWithCredential,
  updateProfile,
  EmailAuthProvider,
  User as FirebaseUser,
  Auth,
  getAuth
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { useFirestore, useFirebase } from "@/infrastructure/firebase/client-provider";
import { useHelp } from "@/hooks/use-help";
import { allSkills } from "@/lib/data";
import { trackSignupProgress, markSignupComplete } from "@/lib/signup-tracker";
import { trackFunnelEvent } from "@/lib/analytics";

const addressSchema = z.object({
  house: z.string().min(1, "House/Flat No. is required."),
  street: z.string().min(3, "Street/Area is required."),
  landmark: z.string().optional(),
  cityPincode: z.string().optional(),
  fullAddress: z.string().optional(),
});


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["Client", "Professional"]),
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
  }),
  fax: z.string().optional(), // Honeypot field
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


export function SignUpForm({ isMapLoaded, referredBy }: { isMapLoaded: boolean; referredBy?: string }) {
  const router = useRouter();
  const { login } = useUser();
  const { auth } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();
  const { setHelp } = useHelp();
  const tError = useTranslations('errors');
  const tAuth = useTranslations('auth');
  const tSkills = useTranslations('skills');

  const getErrorMessage = useCallback((error: any) => {
    if (!error) return "An unexpected error occurred.";
    const errorCode = error.code || (error.message?.match(/\(([^)]+)\)/)?.[1]);
    if (errorCode) {
      try {
        return tError(errorCode);
      } catch (e) {
        return error.message || "An unexpected error occurred.";
      }
    }
    return error.message || "An unexpected error occurred.";
  }, [tError]);

  const [currentStep, setCurrentStep] = useState<"role" | "contact" | "verify_mobile" | "verify_email" | "verification" | "photo" | "skills" | "details">("role");
  const [verificationSubStep, setVerificationSubStep] = useState<"enterAadhar" | "enterOtp" | "enterPan" | "verified">("enterAadhar");
  const [verificationId, setVerificationId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycData, setKycData] = useState<ConfirmAadharOutput['kycData'] | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  // Email Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailResendTimer, setEmailResendTimer] = useState(0);

  // Phone Verification State
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isMobileVerifying, setIsMobileVerifying] = useState(false);
  const [mobileVerificationId, setMobileVerificationId] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpError, setMobileOtpError] = useState<string | null>(null);
  const [mobileResendTimer, setMobileResendTimer] = useState(0);
  const [verifiedCredential, setVerifiedCredential] = useState<any>(null);

  // Use a temporary auth instance to verify phone without triggering main app Login/Redirect
  const { app: mainApp } = useFirebase();
  const tempAuthRef = useRef<Auth | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [verificationType, setVerificationType] = useState<"mobile" | "email" | null>(null);

  useEffect(() => {
    trackFunnelEvent('signup_started');
  }, []);

  useEffect(() => {
    // Initialize Temp Auth
    if (!tempAuthRef.current && mainApp) {
      try {
        // Check if already initialized to avoid duplicate error
        const existingApps = getApps();
        let tempApp = existingApps.find((a) => a.name === 'temp-verify');
        if (!tempApp) {
          tempApp = initializeApp(mainApp.options, 'temp-verify');
        }
        tempAuthRef.current = getAuth(tempApp);

        // Init Recaptcha on Temp Auth
        if (tempAuthRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(tempAuthRef.current, "recaptcha-container", {
            size: "normal",
            callback: (response: any) => {
              // reCAPTCHA solved
            },
          });
        }
      } catch (e: any) {
        console.error('[SignUp] Failed to initialize reCAPTCHA:', e.message);
        toast({ title: "Verification Setup", description: "Could not initialize phone verification. Please refresh the page.", variant: "destructive" });
      }
    }
  }, [mainApp, toast]);

  const handleSendMobileOtp = async () => {
    const mobile = form.getValues("mobile");
    if (!mobile || mobile.length !== 10) {
      form.setError("mobile", { type: "manual", message: "Please enter a valid 10-digit number." });
      return;
    }
    setIsLoading(true);
    try {
      // TEST BYPASS: Skip Firebase Phone Auth for test number
      if (mobile === '9999999999') {
        console.log('[SignUp] Mobile Test Bypass - skipping reCAPTCHA/Firebase');
        setIsMobileVerifying(true);
        setMobileResendTimer(60);
        toast({ title: tAuth('otpSent'), description: "Test mode: Enter 123456 to verify." });
        setIsLoading(false);
        return;
      }

      const formattedNumber = `+91${mobile}`;
      const authInstance = tempAuthRef.current;
      if (!authInstance || !recaptchaVerifierRef.current) {
        toast({ title: "Error", description: "Phone verification is not ready. Please ensure reCAPTCHA has loaded and try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const confirmation = await signInWithPhoneNumber(authInstance, formattedNumber, recaptchaVerifierRef.current);
      // @ts-ignore
      window.confirmationResult = confirmation;
      setMobileVerificationId(confirmation.verificationId);
      setIsMobileVerifying(true);
      setMobileResendTimer(60);
      toast({ title: tAuth('otpSent'), description: "Please check your mobile for the verification code." });
    } catch (error: any) {
      console.error('[SignUp] Mobile OTP Error:', error);
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
      if (recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear();
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
      const mobile = form.getValues("mobile");
      const isTestMobile = mobile === "9999999999";

      if (isTestMobile && mobileOtp === "123456") {
        console.log('[SignUp] Mobile Test Bypass Triggered');
        setIsMobileVerified(true);
        setIsMobileVerifying(false);
        setMobileOtp("");
        toast({ title: "Test Verification", description: "Mobile verified via bypass code.", variant: "default" });
        return;
      }

      // @ts-ignore
      const confirmation = window.confirmationResult;
      if (!confirmation) throw new Error("No verification session found.");

      await confirmation.confirm(mobileOtp);
      const cred = PhoneAuthProvider.credential(confirmation.verificationId, mobileOtp);
      setVerifiedCredential(cred);
      setIsMobileVerified(true);
      setIsMobileVerifying(false); // Close inline UI
      setMobileOtp("");

      if (tempAuthRef.current) await tempAuthRef.current.signOut();

      try {
        if (db) {
          const mobile = form.getValues("mobile");
          await trackSignupProgress(db, mobile, 1, {
            mobile,
            attemptCount: 1
          });
        }
      } catch (trackError) {}

      toast({ title: tAuth('mobileVerified'), className: "bg-green-100 border-green-500" });
    } catch (error: any) {
      setMobileOtpError(tAuth('invalidOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const email = form.getValues("email");
    if (!email || !email.includes("@")) {
      form.setError("email", { type: "manual", message: "Please enter a valid email address." });
      return;
    }
    setIsLoading(true);
    try {
      // TEST BYPASS: Skip email API call for test emails
      const isTestEmail = email.endsWith('@test.com');
      if (isTestEmail) {
        console.log('[SignUp] Email Test Bypass - skipping API call');
        setIsEmailVerifying(true);
        setEmailResendTimer(60);
        toast({ title: tAuth('otpSent'), description: "Test mode: Enter 123456 to verify." });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'send' })
      });
      const data = await response.json();
      if (data.success) {
        setIsEmailVerifying(true);
        setEmailResendTimer(60);
        toast({ title: tAuth('otpSent'), description: "Please check your email for the verification code." });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('[SignUp] Email OTP Error:', error);
      toast({ title: "Error", description: error.message || "Failed to send code.", variant: "destructive" });
    } finally {
      console.log('[SignUp] Email OTP finally - setting loading false');
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const email = form.getValues("email");
    if (!emailOtp || emailOtp.length !== 6) {
      setEmailOtpError(tAuth('invalidOtp'));
      return;
    }
    setIsLoading(true);
    setEmailOtpError(null);
    try {
      // TEST BYPASS: Accept 123456 for test emails
      const isTestEmail = email.endsWith('@test.com');
      if (isTestEmail && emailOtp === '123456') {
        console.log('[SignUp] Email Verify Test Bypass Triggered');
        setIsEmailVerified(true);
        setIsEmailVerifying(false);
        setEmailOtp("");
        toast({ title: tAuth('emailVerified'), className: "bg-green-100 border-green-500" });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: emailOtp, action: 'verify' })
      });
      const data = await response.json();
      if (data.success) {
        setIsEmailVerified(true);
        setIsEmailVerifying(false); // Close inline UI
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

  useEffect(() => {
    const timer = setInterval(() => {
      setMobileResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setEmailResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    let helpTitle = "Sign Up Help";
    let helpContent: React.ReactNode = null;

    switch (currentStep) {
      case "role":
        helpTitle = "Choosing Your Role";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>Welcome to Team4Job! To get started, please select your primary role on the platform.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-semibold">Hire a Professional (Client):</span> Choose this if you want to post jobs and find professionals to install security and technical systems for you.</li>
              <li><span className="font-semibold">Find Work (Professional):</span> Choose this if you are a professional looking to find jobs, place bids, and get hired.</li>
            </ul>
            <p>You can add the other role to your profile later if you wish to both hire and work.</p>
          </div>
        );
        break;
      case "verification":
        helpTitle = "Aadhar Verification Help";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>To ensure a safe and trustworthy platform for everyone, all professionals are required to complete a one-time identity verification.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-semibold">Enter Aadhar:</span> Provide your 12-digit Aadhar number. For testing in sandbox, use <strong className="text-primary">999999990019</strong>.</li>
              <li><span className="font-semibold">Enter OTP:</span> An OTP will be sent to the mobile number linked with your Aadhar. For testing, any 6-digit OTP (e.g., <strong className="text-primary">123456</strong>) will work.</li>
              <li><span className="font-semibold">Verify PAN:</span> After Aadhar, please provide your 10-character PAN number for tax and identity verification.</li>
              <li><span className="font-semibold">Secure Process:</span> This verification is powered by Cashfree&apos;s Secure ID product.</li>
            </ul>
          </div>
        );
        break;
      case "photo":
        helpTitle = "Profile Photo & Virtual ID";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>Your profile photo will be used for your <strong>Virtual ID Card</strong>.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-semibold">Enable Camera:</span> Please allow camera access when prompted by your browser.</li>
              <li><span className="font-semibold">Capture Photo:</span> Use your device&apos;s camera to take a clear, well-lit photo of yourself (Selfie). Ensure a plain background if possible.</li>
            </ul>
            <p>This helps in Video KYC and builds trust with Clients.</p>
          </div>
        );
        break;
      case "skills":
        helpTitle = "Select Your Skills";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>Select the skills you specialize in. This helps Clients find you for the right projects.</p>
            <p>Choose as many as apply. This information will be displayed on your professional profile.</p>
          </div>
        );
        break;
      case "details":
        helpTitle = "Your Details";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>Please provide your account details. If you completed Aadhar verification, some fields will be pre-filled.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-semibold">Name, Email, Mobile:</span> Your basic contact information.</li>
              <li><span className="font-semibold">Password:</span> Choose a secure password for your account.</li>
              <li><span className="font-semibold">Address:</span> Provide your residential address. Start by typing your 6-digit pincode to find your area. Then, pin your exact location on the map.</li>
            </ul>
          </div>
        );
        break;
    }
    setHelp({ title: helpTitle, content: helpContent });
  }, [currentStep, setHelp]);



  useEffect(() => {
    async function fetchSettings() {
      if (!db) return;
      const settingsDoc = await getDoc(doc(db, "settings", "platform"));
      if (settingsDoc.exists()) {
        setPlatformSettings(settingsDoc.data() as PlatformSettings);
      }
    }
    // fetchSettings(); // Disabled to prevent permission error poisoning during login
  }, [db]);

  const form = useForm<z.infer<typeof formSchema>>({
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

  const role = form.watch("role");
  const aadharValue = form.watch("aadhar");
  const panValue = form.watch("pan");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: tAuth('cameraAccessDenied'),
        description: tAuth('cameraAccessDeniedDesc'),
      });
    }
  }, [toast, tAuth]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/png');
      setPhoto(dataUrl);
      form.setValue('realAvatarUrl', dataUrl);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  useEffect(() => {
    if (currentStep === "photo") {
      startCamera();
    }
    const videoElement = videoRef.current;
    return () => {
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [currentStep, startCamera]);

  const handleInitiateVerification = async () => {
    setError(null);
    setIsLoading(true);
    const aadharNumber = form.getValues("aadhar");
    if (!aadharNumber) {
      setError(tError('aadharRequired'));
      setIsLoading(false);
      return;
    }
    try {
      if (aadharNumber === '999999990019') {
        console.log('[SignUp] Aadhar Initiation Test Bypass triggered');
        setVerificationId('test-verif-id');
        setVerificationSubStep("enterOtp");
        toast({
          title: tAuth('otpLabel'),
          description: "Test Mode: Use OTP 123456",
        });
        setIsLoading(false);
        return;
      }
      const result = await initiateAadharVerificationAction({ aadharNumber });
      if (result.success && result.data) {
        setVerificationId(result.data.verificationId);
        setVerificationSubStep("enterOtp");
        toast({
          title: tAuth('otpLabel'),
          description: result.data.message,
        });
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
    const otp = form.getValues("otp");
    if (!otp || otp.length !== 6) {
      setError(tError('invalidOtp'));
      setIsLoading(false);
      return;
    }

    try {
      if (verificationId === 'test-verif-id' && (otp === '123456' || otp === '999999')) {
        console.log('[SignUp] Aadhar Confirmation Test Bypass triggered');
        setVerificationSubStep("enterPan");
        toast({
          title: tAuth('verifyAadhar'),
          description: tAuth('verifyPan'),
        });
        setIsLoading(false);
        return;
      }
      const result = await confirmAadharVerificationAction({ verificationId, otp: otp || "" });
      if (result.success && result.data && result.data.isVerified) {
        // Instead of finishing here, move to PAN step
        setVerificationSubStep("enterPan");
        toast({
          title: tAuth('verifyAadhar'),
          description: tAuth('verifyPan'),
        });
      } else {
        setError(result.data?.message || tError(result.error || 'serverError') || "Verification failed");
      }
    } catch (e: any) {
      setError(tError(e.message) || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleVerifyPan = async () => {
    setError(null);
    setIsLoading(true);
    const pan = form.getValues("pan");
    if (!pan || pan.length !== 10) {
      setError(tError('invalidPan'));
      setIsLoading(false);
      return;
    }

    try {
      if (pan === 'ABCDE1234F') {
        console.log('[SignUp] PAN Verification Test Bypass triggered');
        setVerificationSubStep("verified");
        toast({
          title: tAuth('verifyPan'),
          description: "Test PAN Verified Successfully",
        });
        setCurrentStep("photo");
        setIsLoading(false);
        return;
      }
      const result = await verifyPanAction({ pan: pan });
      if (result.success && result.data && result.data.isValid) {
        setVerificationSubStep("verified");
        toast({
          title: tAuth('verifyPan'),
          description: result.data.message,
        });
        setCurrentStep("photo");
      } else {
        setError(result.data?.message || tError(result.error || 'serverError') || "PAN verification failed");
      }
    } catch (e: any) {
      setError(tError(e.message) || "PAN verification failed.");
    } finally {
      setIsLoading(false);
    }
  };


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
      (s.match && s.match.includes(currentStep as string)) ||
      (currentStep === 'verify_mobile' || currentStep === 'verify_email' ? s.id === 'contact' : false)
    )?.id || 'role';

    const currentStepIndex = steps.findIndex(s => s.id === currentStepId);

    return (
      <div className="mb-10 w-full px-2">
        <div className="flex justify-between items-center relative gap-2">
          {/* Progress Line */}
          <div className="absolute top-[18px] left-0 w-full h-[2px] bg-muted/30 -z-10" />
          <motion.div 
            className="absolute top-[18px] left-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] -z-10"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }}
          />

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 group cursor-default">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isActive ? 1.2 : 1,
                    backgroundColor: isCompleted || isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    borderColor: isCompleted || isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 text-white font-bold text-sm transition-colors shadow-lg",
                    isActive && "ring-4 ring-primary/20"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                </motion.div>
                <span className={cn(
                  "text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground/60"
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
      form.setError("aadhar", { type: "manual", message: "Please complete Aadhar verification." });
      setIsLoading(false);
      return;
    }
    if (!photo) {
      setCurrentStep("photo");
      form.setError("realAvatarUrl", { type: "manual", message: "Please add a profile photo." });
      setIsLoading(false);
      return;
    }

    try {
      if (!isMobileVerified) throw new Error("Please verify your mobile number.");
      if (!isEmailVerified) throw new Error("Please verify your email address.");

      // Step 1: Create user with email/password FIRST
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      let firebaseUser: FirebaseUser = userCredential.user;

      // Step 2: Link phone credential to the newly created user
      if (verifiedCredential) {
        try {
          await linkWithCredential(firebaseUser, verifiedCredential);
        } catch (linkError: any) {
          if (linkError.code !== 'auth/credential-already-associated') {
            // Non-fatal: user still created but mobile not linked in Auth.
            toast({ title: "Link Warning", description: "Mobile could not be linked to Auth account, but signup proceeded.", variant: "default" });
          }
        }
      }

      // Update Profile Name immediately
      await updateProfile(firebaseUser, { displayName: values.name, photoURL: values.realAvatarUrl || PlaceHolderImages[0].imageUrl });

      // Fix: Explicitly declare userRoles
      const userRoles: User['roles'] = [values.role];

      const trialExpiry = new Date();
      const trialDays = platformSettings?.defaultTrialPeriodDays || 30;
      trialExpiry.setDate(trialExpiry.getDate() + trialDays);

      const newUser: Omit<User, 'id'> = {
        name: values.name,
        email: values.email.toLowerCase(),
        mobile: values.mobile,
        isMobileVerified: true,
        isEmailVerified: isEmailVerified,
        roles: userRoles,
        memberSince: new Date(),
        status: 'active',
        avatarUrl: values.realAvatarUrl || PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
        realAvatarUrl: values.realAvatarUrl,
        pincodes: { residential: values.address.cityPincode?.split(',')[0].trim() || '' },
        address: {
          ...values.address,
          cityPincode: values.address.cityPincode || '',
        },
        subscription: {
          planId: 'trial',
          planName: 'Free Trial',
          expiresAt: trialExpiry,
        },
        referredBy: referredBy || "",
      };

      if (values.role === 'Professional') {
        if (values.aadhar) {
          newUser.aadharLast4 = values.aadhar.slice(-4);
        }
        newUser.panNumber = values.pan;
        newUser.kycAddress = values.kycAddress;
        newUser.isPanVerified = true; // Format verified only
        newUser.professionalProfile = {
          tier: 'Bronze',
          points: 0,
          skills: values.skills || [],
          rating: 0,
          reviews: 0,
          verified: true, // Mark as verified since they completed the onboarding KYC
          reputationHistory: []
        };
      }

      const userDocRef = doc(db, "users", firebaseUser.uid);

      await setDoc(userDocRef, { ...newUser, id: firebaseUser.uid });

      // Mark signup as complete in pending_signups
      try {
        const mobile = values.mobile;
        await markSignupComplete(db, mobile, firebaseUser.uid);
        trackFunnelEvent('signup_completed', { role: values.role });
      } catch (trackError) {
        // Silent fail
      }

      // We are essentially already logged in if verified.
      // But let's call login hook just in case app state needs sync.
      // Actually login(email, pass) might fail if we are already logged in?
      // No, login() usually does signInWithEmail...
      // Since we are LINKED, we can just push to dashboard.
      router.push("/dashboard");

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        form.setError("email", { type: "manual", message: "This email is already registered." });
      } else {
        toast({ title: "Sign Up Failed", description: getErrorMessage(error), variant: "destructive" });
      }
      setCurrentStep("details");
    } finally {
      setIsLoading(false);
    }
  }

  const isAadharValid = aadharValue && /^\d{12}$/.test(aadharValue) && form.getFieldState('aadhar').isDirty && !form.getFieldState('aadhar').invalid;
  const isPanValid = panValue && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panValue);
  const isOtpValid = form.watch('otp') && /^\d{6}$/.test(form.watch('otp')!);

  const renderRoleStep = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3 mb-10">
        <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {tAuth('roleLabel')}
        </h3>
        <p className="text-muted-foreground text-lg">
          {tAuth('roleDescription') || "Choose your path on Team4Job"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            id: 'Client',
            title: tAuth('roleclient'),
            desc: tAuth('clientDescription') || "I want to hire professionals for my projects.",
            icon: Search,
            color: 'from-blue-500/20 to-cyan-500/20'
          },
          {
            id: 'Professional',
            title: tAuth('roleProfessional'),
            desc: tAuth('professionalDescription') || "I am a professional looking for work.",
            icon: Briefcase,
            color: 'from-amber-500/20 to-orange-500/20'
          }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              form.setValue("role", item.id as any);
              setCurrentStep("contact");
              trackFunnelEvent('role_selected', { role: item.id });
            }}
            className={cn(
              "group relative p-8 rounded-[2rem] border-2 transition-all duration-500 text-left overflow-hidden hover:shadow-2xl hover:-translate-y-1",
              role === item.id 
                ? "border-primary bg-primary/5 shadow-primary/10" 
                : "border-border hover:border-primary/40 bg-card/50"
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", item.color)} />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                role === item.id ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
              )}>
                <item.icon className="h-7 w-7" />
              </div>
              
              <h4 className="text-2xl font-bold mb-3">{item.title}</h4>
              <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              
              <div className="mt-auto pt-6 flex items-center text-primary font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>

            {role === item.id && (
              <motion.div 
                layoutId="role-check"
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white"
              >
                <Check className="h-5 w-5" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const isAutomatedKycEnabled = process.env.NEXT_PUBLIC_ENABLE_KYC_API === 'true';

  const renderVerificationStep = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 transform rotate-3">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {tAuth('stepVerificationTitle') || "Identity Verification"}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {tAuth('stepVerificationDesc') || "Secure your professional profile with government-issued ID."}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Aadhar Input Section */}
          <div className={cn(
            "p-6 rounded-[2rem] border-2 transition-all duration-500",
            verificationSubStep === 'enterAadhar' || verificationSubStep === 'enterOtp'
              ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" 
              : "border-border/50 bg-muted/20 opacity-60"
          )}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{tAuth('aadharLabel')}</h4>
                <p className="text-xs text-muted-foreground">{tAuth('testAadharDesc')}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="aadhar"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="0000 0000 0000"
                        {...field}
                        maxLength={12}
                        disabled={verificationSubStep !== 'enterAadhar' || isLoading}
                        className="h-12 text-lg tracking-widest font-mono bg-background border-muted-foreground/20 focus:border-primary/50 rounded-xl shadow-inner"
                      />
                    </FormControl>
                    {verificationSubStep === 'enterAadhar' && (
                      <Button
                        type="button"
                        onClick={handleInitiateVerification}
                        disabled={isLoading || field.value?.length !== 12}
                        className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('confirm')}
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {verificationSubStep === "enterOtp" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 pt-6 border-t border-primary/20"
              >
                <div className="text-center space-y-4">
                  <span className="text-sm font-semibold text-primary block">{tAuth('otpTitle') || "Enter Aadhar OTP"}</span>
                  <OtpInput 
                    value={form.watch('otp') || ""}
                    onChange={(val) => form.setValue('otp', val)}
                    length={6}
                  />
                  <Button
                    type="button"
                    onClick={handleConfirmVerification}
                    disabled={isLoading || (form.watch('otp') || "").length !== 6}
                    className="w-full h-12 rounded-xl shadow-lg shadow-primary/20"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyOtp')}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* PAN Input Section (Revealed after Aadhar) */}
          <div className={cn(
            "p-6 rounded-[2rem] border-2 transition-all duration-500",
            verificationSubStep === 'enterPan'
              ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" 
              : verificationSubStep === 'verified' ? "border-success bg-success/5 shadow-xl shadow-success/5" : "border-border/50 bg-muted/20 opacity-60"
          )}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{tAuth('panLabel')}</h4>
                <p className="text-xs text-muted-foreground">{tAuth('testPanDesc')}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="pan"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        {...field}
                        maxLength={10}
                        disabled={verificationSubStep !== 'enterPan' || isLoading}
                        className="h-12 text-lg uppercase font-mono bg-background border-muted-foreground/20 focus:border-primary/50 rounded-xl shadow-inner"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    {verificationSubStep === 'enterPan' && (
                      <Button
                        type="button"
                        onClick={handleVerifyPan}
                        disabled={isLoading || field.value?.length !== 10}
                        className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
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

        <div className="pt-8 flex gap-4">
          <Button variant="outline" onClick={() => setCurrentStep('contact')} className="h-14 flex-1 rounded-2xl">{tAuth('back')}</Button>
        </div>
      </motion.div>
    );
  }

  const renderVerifyMobileStep = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <Smartphone className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold">{tAuth('verifyMobileTitle')}</h3>
        <p className="text-muted-foreground">{tAuth('enterCodeSentTo', { target: form.getValues('mobile') })}</p>
      </div>

      <div className="space-y-4">
        <OtpInput 
          value={mobileOtp} 
          onChange={setMobileOtp} 
          error={!!mobileOtpError}
          disabled={isLoading}
        />
        
        {mobileOtpError && (
          <p className="text-sm text-destructive text-center font-medium animate-in shake-1 duration-300">
            {mobileOtpError}
          </p>
        )}

        <div className="text-center">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSendMobileOtp} 
                disabled={mobileResendTimer > 0 || isLoading}
                className="text-primary"
            >
                {mobileResendTimer > 0 ? tAuth('resendIn', { seconds: mobileResendTimer }) : tAuth('resendOtp')}
            </Button>
        </div>
      </div>

      <div className="pt-6 flex gap-4">
        <Button variant="outline" onClick={() => setCurrentStep('contact')} className="h-12 flex-1 rounded-xl">{tAuth('back')}</Button>
        <Button 
            onClick={handleVerifyMobileOtp} 
            disabled={isLoading || mobileOtp.length !== 6}
            className="h-12 flex-[2] rounded-xl font-bold"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('confirm')}
        </Button>
      </div>
    </motion.div>
  );

  const renderVerifyEmailStep = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <Mail className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold">{tAuth('verifyEmailTitle')}</h3>
        <p className="text-muted-foreground">{tAuth('enterCodeSentTo', { target: form.getValues('email') })}</p>
      </div>

      <div className="space-y-4">
        <OtpInput 
          value={emailOtp} 
          onChange={setEmailOtp} 
          error={!!emailOtpError}
          disabled={isLoading}
        />
        
        {emailOtpError && (
          <p className="text-sm text-destructive text-center font-medium animate-in shake-1 duration-300">
            {emailOtpError}
          </p>
        )}

        <div className="text-center">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSendEmailOtp} 
                disabled={emailResendTimer > 0 || isLoading}
                className="text-primary"
            >
                {emailResendTimer > 0 ? tAuth('resendIn', { seconds: emailResendTimer }) : tAuth('resendOtp')}
            </Button>
        </div>
      </div>

      <div className="pt-6 flex gap-4">
        <Button variant="outline" onClick={() => setCurrentStep('contact')} className="h-12 flex-1 rounded-xl">{tAuth('back')}</Button>
        <Button 
            onClick={handleVerifyEmailOtp} 
            disabled={isLoading || emailOtp.length !== 6}
            className="h-12 flex-[2] rounded-xl font-bold"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('confirm')}
        </Button>
      </div>
    </motion.div>
  );

  const renderPhotoStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">{tAuth('stepPhoto')}</h3>
      <p className="text-sm text-muted-foreground">{tAuth('profilePhotoDesc')}</p>

      <div className="relative mx-auto w-72 h-72 group">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative w-full h-full bg-muted rounded-2xl overflow-hidden border-2 border-border shadow-inner flex items-center justify-center bg-zinc-900/10 dark:bg-zinc-100/5">
          {photo ? (
            <NextImage 
              src={photo} 
              alt={tAuth('profilePreview')} 
              fill 
              className="object-cover animate-in fade-in duration-500" 
              unoptimized 
            />
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" autoPlay muted playsInline />
              {!hasCameraPermission && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-6 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                  <h4 className="font-bold text-sm mb-1">{tAuth('cameraAccessRequired')}</h4>
                  <p className="text-xs text-muted-foreground">{tAuth('cameraAccessRequiredDesc')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {photo ? (
          <Button variant="outline" onClick={() => { setPhoto(null); startCamera(); }} className="w-full h-11" aria-label={tAuth('retakePhoto')}>{tAuth('retakePhoto')}</Button>
        ) : (
          <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full h-11" aria-label={tAuth('capturePhoto')}>
            <Camera className="mr-2 h-4 w-4" />
            {tAuth('capturePhoto')}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setCurrentStep(role === 'Client' ? 'role' : 'verification')} className="w-full h-11">{tAuth('back')}</Button>
        <Button onClick={() => setCurrentStep(role === 'Professional' ? 'skills' : 'details')} className="w-full h-11" disabled={!photo}>{tAuth('next')}</Button>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div >
  );

  const renderSkillsStep = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-3 mb-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 transform rotate-3">
          <Briefcase className="h-8 w-8" />
        </div>
        <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {tAuth('stepSkills') || "Your Expertise"}
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {tAuth('skillsDesc') || "Select the services you offer. This helps clients find you faster."}
        </p>
      </div>

      <div className="p-1">
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <SkillsSelector 
                selectedSkills={field.value || []} 
                onChange={field.onChange} 
                className="max-h-[400px] overflow-y-auto"
              />
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-medium">
                  Selected: <span className="text-primary font-bold">{(field.value || []).length}</span> skills
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-8 flex gap-4">
        <Button variant="outline" onClick={() => setCurrentStep('photo')} className="h-14 flex-1 rounded-2xl">{tAuth('back')}</Button>
        <Button 
          onClick={() => setCurrentStep('details')} 
          disabled={(form.watch('skills') || []).length === 0}
          className="h-14 flex-[2] rounded-2xl font-bold shadow-xl shadow-primary/20"
        >
          {tAuth('next')}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );

  const renderContactStep = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {tAuth('contactVerificationTitle')}
          </h3>
          <p className="text-muted-foreground">{tAuth('contactVerificationSubtitle') || "Verify your credentials to secure your account."}</p>
        </div>

        <div className="space-y-6">
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> {tAuth('mobileNumber')}
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex gap-2">
                        <Input
                          placeholder={tAuth('mobilePlaceholder')}
                          {...field}
                          disabled={isMobileVerified || isLoading || isMobileVerifying}
                          className="h-12 bg-background border-muted-foreground/20 focus:border-primary/50 transition-all rounded-xl text-lg font-medium"
                          autoComplete="tel"
                        />
                        {!isMobileVerified && !isMobileVerifying && (
                          <Button 
                            type="button" 
                            onClick={handleSendMobileOtp} 
                            disabled={isLoading || !field.value || field.value.length !== 10} 
                            className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('sendOtp')}
                          </Button>
                        )}
                        {isMobileVerified && (
                          <div className="h-12 px-4 rounded-xl bg-success/10 text-success flex items-center gap-2 border border-success/20">
                            <ShieldCheck className="h-5 w-5" />
                            <span className="font-semibold">{tAuth('verified')}</span>
                          </div>
                        )}
                      </div>

                      {isMobileVerifying && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{tAuth('enterMobileOtp')}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsMobileVerifying(false)}
                              className="h-8 text-xs hover:bg-transparent hover:text-primary"
                            >
                              {tAuth('change')}
                            </Button>
                          </div>
                          <OtpInput 
                            value={mobileOtp}
                            onChange={setMobileOtp}
                            length={6}
                          />
                          <div className="flex gap-2 pt-2">
                            <Button 
                              onClick={handleVerifyMobileOtp} 
                              disabled={isLoading || mobileOtp.length !== 6}
                              className="flex-1 h-11 rounded-xl"
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyOtp')}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleSendMobileOtp} 
                              disabled={isLoading}
                              className="h-11 px-4 rounded-xl"
                            >
                              {tAuth('resend')}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {tAuth('email')}
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="name@example.com" 
                          {...field} 
                          disabled={isEmailVerified || isLoading || isEmailVerifying} 
                          className="h-12 bg-background border-muted-foreground/20 focus:border-primary/50 transition-all rounded-xl font-medium"
                          autoComplete="email"
                        />
                        {!isEmailVerified && !isEmailVerifying && (
                          <Button 
                            type="button" 
                            onClick={handleSendEmailOtp} 
                            disabled={isLoading || !field.value || !field.value.includes('@')} 
                            className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('sendOtp')}
                          </Button>
                        )}
                        {isEmailVerified && (
                          <div className="h-12 px-4 rounded-xl bg-success/10 text-success flex items-center gap-2 border border-success/20">
                            <ShieldCheck className="h-5 w-5" />
                            <span className="font-semibold">{tAuth('verified')}</span>
                          </div>
                        )}
                      </div>

                      {isEmailVerifying && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{tAuth('enterEmailOtp')}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsEmailVerifying(false)}
                              className="h-8 text-xs hover:bg-transparent hover:text-primary"
                            >
                              {tAuth('change')}
                            </Button>
                          </div>
                          <OtpInput 
                            value={emailOtp}
                            onChange={setEmailOtp}
                            length={6}
                          />
                          <div className="flex gap-2 pt-2">
                            <Button 
                              onClick={handleVerifyEmailOtp} 
                              disabled={isLoading || emailOtp.length !== 6}
                              className="flex-1 h-11 rounded-xl"
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAuth('verifyOtp')}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleSendEmailOtp} 
                              disabled={isLoading}
                              className="h-11 px-4 rounded-xl"
                            >
                              {tAuth('resend')}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-8 flex gap-4">
          <Button variant="outline" onClick={() => setCurrentStep('role')} className="h-14 flex-1 rounded-2xl">{tAuth('back')}</Button>
          <Button 
            type="button"
            onClick={() => {
                if (isMobileVerified && isEmailVerified) {
                    setCurrentStep(role === 'Professional' ? 'verification' : 'photo');
                }
            }}
            disabled={!isMobileVerified || !isEmailVerified}
            className="h-14 flex-[2] rounded-2xl font-bold shadow-xl shadow-primary/20"
          >
            {tAuth('next')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderDetailsStep = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3 mb-10">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 transform rotate-3">
          <LucideUser className="h-8 w-8" />
        </div>
        <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {tAuth('details') || "Final Details"}
        </h3>
        <p className="text-muted-foreground">
          {tAuth('detailsDesc') || "Complete your profile to join the Team4Job community."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Info Group */}
        <div className="p-6 rounded-[2rem] border-2 border-border/50 bg-card/50 space-y-4">
          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
            <LucideUser className="h-4 w-4 text-primary" /> Profile Info
          </h4>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="John Doe" 
                    {...field} 
                    className="h-12 bg-background border-muted-foreground/20 focus:border-primary/50 rounded-xl" 
                    autoComplete="name" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="h-12 bg-muted/30 border-dashed rounded-xl" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="h-12 bg-muted/30 border-dashed rounded-xl" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Security Group */}
        <div className="p-6 rounded-[2rem] border-2 border-border/50 bg-card/50 space-y-4">
          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Security
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        className="h-12 pr-10 bg-background border-muted-foreground/20 focus:border-primary/50 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1.5 h-9"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        className="h-12 pr-10 bg-background border-muted-foreground/20 focus:border-primary/50 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1.5 h-9"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Location Group */}
        <div className="p-6 rounded-[2rem] border-2 border-border/50 bg-card/50 space-y-4">
          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Location
          </h4>
          <AddressForm
            pincodeName="address.cityPincode"
            houseName="address.house"
            streetName="address.street"
            landmarkName="address.landmark"
            fullAddressName="address.fullAddress"
            onLocationGeocoded={setMapCenter}
            mapCenter={mapCenter}
            isMapLoaded={isMapLoaded}
            // Add custom styles if AddressForm supports them
          />
        </div>

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-6 rounded-2xl border-2 border-primary/20 bg-primary/5">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="w-6 h-6 rounded-lg data-[state=checked]:bg-primary"
                />
              </FormControl>
              <div className="leading-none">
                <FormLabel className="text-sm font-medium">
                  {tAuth.rich('iAgreeToLabel', {
                    terms: (chunks) => <Link href="/terms-of-service" target="_blank" className="underline text-primary font-bold">{tAuth('termsOfService')}</Link>,
                    privacy: (chunks) => <Link href="/privacy-policy" target="_blank" className="underline text-primary font-bold">{tAuth('privacyPolicy')}</Link>
                  })}
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="pt-8 flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(role === 'Professional' ? 'skills' : 'photo')} 
          className="h-14 flex-1 rounded-2xl font-bold"
        >
          {tAuth('back')}
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || !isMobileVerified || !isEmailVerified}
          className="h-14 flex-[2] rounded-2xl font-bold shadow-xl shadow-primary/20 text-lg"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <>
              {tAuth('createAccount')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );


  return (
    <div className="w-full max-w-4xl mx-auto">
      {renderStepIndicator()}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === "role" && <Fragment key="role">{renderRoleStep()}</Fragment>}
            {currentStep === "contact" && <Fragment key="contact">{renderContactStep()}</Fragment>}
            {(currentStep === "verify_mobile" || (currentStep as any) === 'enterOtp') && (
              <Fragment key="verify_mobile">{renderVerifyMobileStep()}</Fragment>
            )}
            {currentStep === "verify_email" && <Fragment key="verify_email">{renderVerifyEmailStep()}</Fragment>}
            {(currentStep === "verification") && <Fragment key="verification">{renderVerificationStep()}</Fragment>}
            {currentStep === "photo" && <Fragment key="photo">{renderPhotoStep()}</Fragment>}
            {currentStep === 'skills' && <Fragment key="skills">{renderSkillsStep()}</Fragment>}
            {currentStep === "details" && <Fragment key="details">{renderDetailsStep()}</Fragment>}
          </AnimatePresence>
          <div id="recaptcha-container" className="hidden"></div>
        </form>
      </Form>
    </div>
  );
}
