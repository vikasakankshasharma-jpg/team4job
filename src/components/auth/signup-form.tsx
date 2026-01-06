
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
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
import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Camera, Upload } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { User, PlatformSettings } from "@/lib/types";
import {
  initiateAadharVerification,
  confirmAadharVerification,
  ConfirmAadharOutput,
} from "@/ai/flows/aadhar-verification";
import { verifyPan } from "@/ai/flows/pan-verification";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddressForm } from "@/components/ui/address-form";
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
import { useAuth, useFirestore, useFirebase } from "@/lib/firebase/client-provider";
import { useHelp } from "@/hooks/use-help";
import { allSkills } from "@/lib/data";

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
  role: z.enum(["Job Giver", "Installer"]),
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
});


export function SignUpForm({ isMapLoaded, referredBy }: { isMapLoaded: boolean; referredBy?: string }) {
  const router = useRouter();
  const { login } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setHelp } = useHelp();

  const [currentStep, setCurrentStep] = useState<"role" | "details" | "photo" | "verification" | "skills">("role");
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

  // Phone Verification State
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [mobileVerificationId, setMobileVerificationId] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [showMobileOtpInput, setShowMobileOtpInput] = useState(false);
  const [verifiedCredential, setVerifiedCredential] = useState<any>(null); // Store credential for linking
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Use a temporary auth instance to verify phone without triggering main app Login/Redirect
  const { app: mainApp } = useFirebase();
  const tempAuthRef = useRef<Auth | null>(null);

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
            size: "invisible",
            callback: (response: any) => {
              // reCAPTCHA solved
            },
          });
        }
      } catch (e) {
        console.error("Temp Auth Init Error", e);
      }
    }
  }, [mainApp]);

  const handleSendMobileOtp = async () => {
    const mobile = form.getValues("mobile");
    if (!mobile || mobile.length !== 10) {
      form.setError("mobile", { type: "manual", message: "Please enter a valid 10-digit number." });
      return;
    }
    setIsLoading(true);
    try {
      const formattedNumber = `+91${mobile}`;
      // Capture ref current value to satisfy TS
      const authInstance = tempAuthRef.current;
      if (!authInstance || !recaptchaVerifierRef.current) return;

      const confirmation = await signInWithPhoneNumber(authInstance, formattedNumber, recaptchaVerifierRef.current);
      // @ts-ignore
      window.confirmationResult = confirmation;
      setMobileVerificationId(confirmation.verificationId);
      setShowMobileOtpInput(true);
      toast({ title: "OTP Sent", description: "Please check your mobile for the verification code." });
    } catch (error: any) {
      console.error("SMS Error:", error);
      toast({ title: "Error", description: error.message || "Could not send OTP.", variant: "destructive" });
      if (recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter a 6-digit code.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // Confirm OTP on Temp Auth
      // @ts-ignore
      const confirmation = window.confirmationResult;
      if (!confirmation) throw new Error("No verification session found.");

      // signs in the temp user
      await confirmation.confirm(mobileOtp);

      // Reconstruct credential for Main account linking
      const cred = PhoneAuthProvider.credential(confirmation.verificationId, mobileOtp);
      setVerifiedCredential(cred);

      setIsMobileVerified(true);
      setShowMobileOtpInput(false);

      // Sign out temp auth to be clean
      if (tempAuthRef.current) await tempAuthRef.current.signOut();

      toast({ title: "Verified!", description: "Mobile number verified successfully.", className: "bg-green-100 border-green-500" });
    } catch (error: any) {
      console.error("Verify Error:", error);
      toast({ title: "Verification Failed", description: "Invalid OTP. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let helpTitle = "Sign Up Help";
    let helpContent: React.ReactNode = null;

    switch (currentStep) {
      case "role":
        helpTitle = "Choosing Your Role";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>Welcome to CCTV Job Connect! To get started, please select your primary role on the platform.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-semibold">Hire an Installer (Job Giver):</span> Choose this if you want to post jobs and find professionals to install CCTV systems for you.</li>
              <li><span className="font-semibold">Find Work (Installer):</span> Choose this if you are a professional installer looking to find jobs, place bids, and get hired.</li>
            </ul>
            <p>You can add the other role to your profile later if you wish to both hire and work.</p>
          </div>
        );
        break;
      case "verification":
        helpTitle = "Aadhar Verification Help";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>To ensure a safe and trustworthy platform for everyone, all installers are required to complete a one-time identity verification.</p>
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
            <p>This helps in Video KYC and builds trust with Job Givers.</p>
          </div>
        );
        break;
      case "skills":
        helpTitle = "Select Your Skills";
        helpContent = (
          <div className="space-y-4 text-sm">
            <p>Select the skills you specialize in. This helps Job Givers find you for the right projects.</p>
            <p>Choose as many as apply. This information will be displayed on your installer profile.</p>
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
      console.error("Error accessing camera:", err);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please enable camera permissions in your browser settings to take a photo.",
      });
    }
  }, [toast]);

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
      setError("Aadhar number is required.");
      setIsLoading(false);
      return;
    }
    try {
      const result = await initiateAadharVerification({ aadharNumber });
      if (result.success) {
        setVerificationId(result.verificationId);
        setVerificationSubStep("enterOtp");
        toast({
          title: "OTP Sent!",
          description: result.message,
        });
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmVerification = async () => {
    setError(null);
    setIsLoading(true);
    const otp = form.getValues("otp");
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await confirmAadharVerification({ verificationId, otp: otp || "" });
      if (result.isVerified && result.kycData) {
        // Instead of finishing here, move to PAN step
        setVerificationSubStep("enterPan");
        toast({
          title: "Aadhar Verified!",
          description: "Please enter your PAN details to complete verification.",
        });
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };


  const handleVerifyPan = async () => {
    setError(null);
    setIsLoading(true);
    const pan = form.getValues("pan");
    if (!pan || pan.length !== 10) {
      setError("Please enter a valid 10-character PAN.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await verifyPan({ panNumber: pan });
      if (result.valid) {
        setVerificationSubStep("verified");
        toast({
          title: "PAN Verified!",
          description: result.message,
        });
        setCurrentStep("photo");
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e.message || "PAN verification failed.");
    } finally {
      setIsLoading(false);
    }
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
      console.log("Bot detected via honeypot.");
      setIsLoading(false);
      return;
    }

    if (values.role === 'Installer' && verificationSubStep !== 'verified') {
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
      let firebaseUser: FirebaseUser | null = auth.currentUser;

      // If mobile is verified, we have the credential stored.
      if (isMobileVerified && verifiedCredential && firebaseUser) {
        try {
          await linkWithCredential(firebaseUser, verifiedCredential);
          console.log("Phone Credentials Linked Successfully");
        } catch (linkError: any) {
          if (linkError.code === 'auth/credential-already-associated') {
            // Ignore if already done
          } else {
            console.error("Link Error", linkError);
            // Non-fatal? If link fails, user still created but mobile not linked in Auth.
            toast({ title: "Link Warning", description: "Mobile could not be linked to Auth account, but signup proceeded.", variant: "default" });
          }
        }
      } else {
        // Fallback: If mobile NOT verified (should be blocked by validation)
        // Or if session lost.
        if (!isMobileVerified) throw new Error("Please verify your mobile number.");

        // If execution reaches here, it means we required verification but session is gone?
        // We can try creating user, but mobile won't be "Phone Auth" verified.
        // Reverting to Create User:
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        firebaseUser = userCredential.user;
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
        isEmailVerified: false,
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

      if (values.role === 'Installer') {
        if (values.aadhar) {
          newUser.aadharLast4 = values.aadhar.slice(-4);
        }
        newUser.panNumber = values.pan;
        newUser.kycAddress = values.kycAddress;
        newUser.isPanVerified = true;
        newUser.installerProfile = {
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
        console.error("Signup failed:", error);
        toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
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
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>I want to...</FormLabel>
            <Select onValueChange={(value) => field.onChange(value)} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select your primary role" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Job Giver">Hire an Installer</SelectItem>
                <SelectItem value="Installer">Find Work as an Installer</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button onClick={() => setCurrentStep(role === 'Installer' ? 'verification' : 'photo')} className="w-full" disabled={!role}>Next</Button>
    </div>
  );

  const renderVerificationStep = () => {
    if (verificationSubStep !== 'verified') {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">Step 1: Aadhar Verification</h3>
          <p className="text-sm text-muted-foreground">
            To ensure a trustworthy platform, installers are required to complete KYC verification.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="aadhar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aadhar Number</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="XXXX XXXX XXXX"
                      {...field}
                      maxLength={12}
                      disabled={verificationSubStep !== 'enterAadhar'}
                    />
                  </FormControl>
                  {verificationSubStep === 'enterAadhar' && (
                    <Button
                      type="button"
                      onClick={handleInitiateVerification}
                      disabled={!isAadharValid || isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send OTP
                    </Button>
                  )}
                </div>
                <FormDescription>For testing, use Aadhaar: <strong>999999990019</strong></FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {verificationSubStep === "enterOtp" && (
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>One-Time Password (OTP)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Enter 6-digit OTP"
                        {...field}
                        maxLength={6}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      onClick={handleConfirmVerification}
                      disabled={isLoading || !isOtpValid}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify OTP
                    </Button>
                  </div>
                  <FormDescription>For testing, use any 6-digit OTP, e.g., <strong>123456</strong>.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {verificationSubStep === "enterPan" && (
            <FormField
              control={form.control}
              name="pan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PAN Number</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        {...field}
                        maxLength={10}
                        className="uppercase"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      onClick={handleVerifyPan}
                      disabled={isLoading || !isPanValid}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify PAN
                    </Button>
                  </div>
                  <FormDescription>For testing, use any valid PAN format e.g., <strong>ABCDE1234F</strong>.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button variant="outline" onClick={() => setCurrentStep('role')} className="w-full">Back</Button>
        </div>
      )
    }
    return null;
  }

  const renderPhotoStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">{role === 'Job Giver' ? 'Step 2: Add a Profile Photo' : 'Step 3: Profile Photo & Video KYC'}</h3>
      <p className="text-sm text-muted-foreground">{role === 'Job Giver' ? 'A real photo increases trust.' : 'This photo will be used for your Virtual ID Card. Please ensure good lighting and a plain background.'}</p>

      <div className="mx-auto w-64 h-64 bg-muted rounded-full overflow-hidden relative flex items-center justify-center">
        {photo ? (
          <Image src={photo} alt="Profile preview" fill className="object-cover" />
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            {!hasCameraPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center">
                <Alert variant="destructive">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access to use this feature.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setPhoto(PlaceHolderImages[0].imageUrl);
                    form.setValue('realAvatarUrl', PlaceHolderImages[0].imageUrl);
                  }}
                >
                  Use Test Photo
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        {photo ? (
          <Button variant="outline" onClick={() => { setPhoto(null); startCamera(); }} className="w-full">Retake Photo</Button>
        ) : (
          <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
            <Camera className="mr-2 h-4 w-4" />
            Capture
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setCurrentStep(role === 'Job Giver' ? 'role' : 'verification')} className="w-full">Back</Button>
        <Button onClick={() => setCurrentStep(role === 'Installer' ? 'skills' : 'details')} className="w-full" disabled={!photo}>Next</Button>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );

  const renderSkillsStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">Step 3: Select Your Skills</h3>
      <p className="text-sm text-muted-foreground">Choose the services you offer. This will help Job Givers find you for relevant projects.</p>

      <FormField
        control={form.control}
        name="skills"
        render={() => (
          <FormItem>
            <div className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
              {allSkills.map((skill) => (
                <FormField
                  key={skill}
                  control={form.control}
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

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setCurrentStep('photo')} className="w-full">Back</Button>
        <Button onClick={() => setCurrentStep('details')} className="w-full" disabled={(form.watch('skills') || []).length === 0}>Next</Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">{role === 'Job Giver' ? 'Step 3: Your Details' : 'Step 4: Your Details'}</h3>
      {verificationSubStep === 'verified' && (
        <Alert variant="success">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>AadharVerified!</AlertTitle>
          <AlertDescription>Your Name, Mobile, and PAN have been verified. Please confirm your address.</AlertDescription>
        </Alert>
      )}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="John Doe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="name@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="mobile"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mobile Number</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  placeholder="10-digit mobile number"
                  {...field}
                  disabled={isMobileVerified}
                />
              </FormControl>
              {!isMobileVerified && !showMobileOtpInput && (
                <Button type="button" onClick={handleSendMobileOtp} disabled={isLoading} variant="secondary">
                  Verify
                </Button>
              )}
              {isMobileVerified && (
                <Button type="button" disabled variant="ghost" className="text-green-600">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Verified
                </Button>
              )}
            </div>
            {showMobileOtpInput && !isMobileVerified && (
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Enter 6-digit SMS OTP"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)}
                  maxLength={6}
                />
                <Button type="button" onClick={handleVerifyMobileOtp} disabled={isLoading}>
                  Confirm
                </Button>
              </div>
            )}
            <FormDescription>Verified mobile number will be your registered ID.</FormDescription>
            <FormMessage />
            <div id="recaptcha-container"></div>
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
              <Input type="password" placeholder="••••••••" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <AddressForm
        pincodeName="address.cityPincode"
        houseName="address.house"
        streetName="address.street"
        landmarkName="address.landmark"
        fullAddressName="address.fullAddress"
        onLocationGeocoded={setMapCenter}
        mapCenter={mapCenter}
        isMapLoaded={isMapLoaded}
      />
      <FormField
        control={form.control}
        name="termsAccepted"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                I agree to the <Link href="/terms" target="_blank" className="underline text-primary">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="underline text-primary">Privacy Policy</Link>.
              </FormLabel>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
      {/* Honeypot Field - Hidden from humans */}
      <FormField
        control={form.control}
        name="fax"
        render={({ field }) => (
          <FormItem className="hidden">
            <FormControl>
              <Input {...field} tabIndex={-1} autoComplete="off" />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setCurrentStep(role === 'Installer' ? 'skills' : 'photo')} className="w-full">Back</Button>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </div>
    </div>
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {currentStep === "role" && renderRoleStep()}
        {(currentStep === "verification" || verificationSubStep === 'enterPan') && renderVerificationStep()}
        {currentStep === "photo" && renderPhotoStep()}
        {currentStep === 'skills' && renderSkillsStep()}
        {currentStep === "details" && renderDetailsStep()}
      </form>
    </Form>
  );
}
