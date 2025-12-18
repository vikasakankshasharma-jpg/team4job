
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useState, useRef, useEffect } from "react";
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth, useFirestore } from "@/lib/firebase/client-provider";
import { useHelp } from "@/hooks/use-help";
import { Checkbox } from "../ui/checkbox";
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
});


export function SignUpForm({ isMapLoaded }: { isMapLoaded: boolean }) {
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
              <li><span className="font-semibold">Secure Process:</span> This verification is powered by Cashfree's Secure ID product.</li>
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
              <li><span className="font-semibold">Capture Photo:</span> Use your device's camera to take a clear, well-lit photo of yourself (Selfie). Ensure a plain background if possible.</li>
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
    if (currentStep === "photo") {
      startCamera();
    }
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [currentStep]);

  useEffect(() => {
    async function fetchSettings() {
      if (!db) return;
      const settingsDoc = await getDoc(doc(db, "settings", "platform"));
      if (settingsDoc.exists()) {
        setPlatformSettings(settingsDoc.data() as PlatformSettings);
      }
    }
    fetchSettings();
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
    },
  });

  const role = form.watch("role");
  const aadharValue = form.watch("aadhar");
  const panValue = form.watch("pan");

  const startCamera = async () => {
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
  };

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
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      // Fix: Explicitly declare userRoles
      const userRoles: User['roles'] = [values.role];

      const trialExpiry = new Date();
      const trialDays = platformSettings?.defaultTrialPeriodDays || 30;
      trialExpiry.setDate(trialExpiry.getDate() + trialDays);

      const newUser: Omit<User, 'id'> = {
        name: values.name,
        email: values.email.toLowerCase(),
        mobile: values.mobile,
        roles: userRoles,
        memberSince: new Date(),
        status: 'active',
        avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
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
        }
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

      const loggedIn = await login(values.email, values.password);

      if (loggedIn) {
        router.push("/dashboard");
      } else {
        throw new Error("Failed to log in after sign up.");
      }

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
          <img src={photo} alt="Profile preview" className="w-full h-full object-cover" />
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
            <FormControl>
              <Input placeholder="10-digit mobile number" {...field} />
            </FormControl>
            <FormMessage />
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
