
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
import type { User } from "@/lib/types";
import {
  initiateAadharVerification,
  confirmAadharVerification,
  ConfirmAadharOutput,
} from "@/ai/flows/aadhar-verification";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddressForm } from "@/components/ui/address-form";
import { collection, query, where, getDocs, or, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const addressSchema = z.object({
  house: z.string().optional(),
  street: z.string().optional(),
  landmark: z.string().optional(),
  cityPincode: z.string().min(8, "Please select a pincode and post office."),
  fullAddress: z.string().optional(),
});


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["Job Giver", "Installer", "Both (Job Giver & Installer)"]),
  mobile: z.string().regex(/^\d{10}$/, { message: "Must be a 10-digit mobile number." }),
  address: addressSchema,
  aadhar: z.string().optional(),
  otp: z.string().optional(),
  realAvatarUrl: z.string().optional(),
  kycAddress: z.string().optional(),
});


export function SignUpForm() {
  const router = useRouter();
  const { login } = useUser();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<"role" | "details" | "photo" | "verification">("role");
  const [verificationSubStep, setVerificationSubStep] = useState<"enterAadhar" | "enterOtp" | "verified">("enterAadhar");
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycData, setKycData] = useState<ConfirmAadharOutput['kycData'] | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);

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
      otp: "",
      realAvatarUrl: "",
      kycAddress: "",
    },
  });
  
  const role = form.watch("role");
  const aadharValue = form.watch("aadhar");

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
            description: "Please enable camera permissions to take a photo.",
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
        setHasCameraPermission(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPhoto(dataUrl);
        form.setValue('realAvatarUrl', dataUrl);
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        setHasCameraPermission(false);
      };
      reader.readAsDataURL(file);
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
        setTransactionId(result.transactionId);
        setVerificationSubStep("enterOtp");
        toast({
          title: "OTP Sent!",
          description: result.message,
        });
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
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
      const aadharNumber = form.getValues("aadhar");
      
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("aadharNumber", "==", aadharNumber));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError("This Aadhar number is already registered to another account.");
        setIsLoading(false);
        return;
      }
      
      const result = await confirmAadharVerification({ transactionId, otp: otp || "" });
      if (result.isVerified && result.kycData) {
        setVerificationSubStep("verified");
        toast({
          title: "Verification Successful!",
          description: "Your KYC data has been pre-filled.",
          variant: "success",
        });
        form.clearErrors("aadhar");

        setKycData(result.kycData);
        form.setValue("name", result.kycData.name, { shouldValidate: true });
        form.setValue("mobile", result.kycData.mobile, { shouldValidate: true });
        
        // Store the permanent Aadhar address
        form.setValue("kycAddress", `Pincode: ${result.kycData.pincode}`, { shouldValidate: true });
        
        // Pre-fill the current location fields for user convenience
        form.setValue("address.cityPincode", result.kycData.pincode, { shouldValidate: true, shouldDirty: true });
        
        setCurrentStep("photo");
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    if ((values.role === 'Installer' || values.role === 'Both (Job Giver & Installer)') && verificationSubStep !== 'verified') {
        setCurrentStep("verification");
        form.setError("aadhar", { type: "manual", message: "Please complete Aadhar verification." });
        setIsLoading(false);
        return;
    }
    if(!photo) {
        setCurrentStep("photo");
        form.setError("realAvatarUrl", { type: "manual", message: "Please add a profile photo." });
        setIsLoading(false);
        return;
    }

    // --- Start: Duplicate Check ---
    const usersRef = collection(db, "users");
    const q = query(usersRef, or(
        where("email", "==", values.email.toLowerCase()),
        where("mobile", "==", values.mobile)
    ));

    const querySnapshot = await getDocs(q);
    let isDuplicate = false;
    querySnapshot.forEach((doc) => {
        const existingUser = doc.data();
        if (existingUser.email.toLowerCase() === values.email.toLowerCase()) {
            form.setError("email", { type: "manual", message: "This email is already registered." });
            isDuplicate = true;
        }
        if (existingUser.mobile === values.mobile) {
            form.setError("mobile", { type: "manual", message: "This mobile number is already registered." });
            isDuplicate = true;
        }
    });

    if (isDuplicate) {
        setCurrentStep("details"); // Make sure user sees the error
        setIsLoading(false);
        return;
    }
    // --- End: Duplicate Check ---

    try {
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;
        
        const userRoles = values.role === 'Both (Job Giver & Installer)' ? ['Job Giver', 'Installer'] : [values.role];

        const newUser: Omit<User, 'id'> = {
            name: values.name,
            email: values.email,
            mobile: values.mobile,
            roles: userRoles,
            memberSince: new Date(),
            avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
            realAvatarUrl: values.realAvatarUrl,
            pincodes: { residential: values.address.cityPincode.split(',')[0].trim() },
            address: values.address,
        };
        
        if (values.role !== 'Job Giver') {
            newUser.aadharNumber = values.aadhar;
            newUser.kycAddress = values.kycAddress;
            newUser.installerProfile = {
                tier: 'Bronze',
                points: 0,
                skills: [],
                rating: 0,
                reviews: 0,
                verified: true,
                reputationHistory: []
            };
        }
        
        await setDoc(doc(db, "users", firebaseUser.uid), newUser);
        
        // This is a simplified login for the demo, which will trigger the useUser hook's onAuthStateChanged
        // In a real app, you might not need to call login() explicitly if you listen to auth state changes correctly
        const loggedIn = await login(values.email, values.password);

        if (loggedIn) {
            router.push("/dashboard");
        } else {
             throw new Error("Failed to log in after sign up.");
        }

    } catch(error: any) {
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
  const isOtpValid = form.watch('otp') && /^\d{6}$/.test(form.watch('otp')!);

  const renderRoleStep = () => (
      <div className="space-y-4">
        <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
            <FormItem>
                <FormLabel>I am a...</FormLabel>
                <Select onValueChange={(value) => field.onChange(value)} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Job Giver">Job Giver (I want to hire)</SelectItem>
                        <SelectItem value="Installer">Installer (I want to work)</SelectItem>
                        <SelectItem value="Both (Job Giver & Installer)">Both (Hire and Work)</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        <Button onClick={() => setCurrentStep(role === 'Job Giver' ? 'photo' : 'verification')} className="w-full" disabled={!role}>Next</Button>
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
                                <FormDescription>For this demo, the OTP is always <strong>123456</strong>.</FormDescription>
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
        <h3 className="font-semibold">{role === 'Job Giver' ? 'Step 2: Add a Profile Photo' : 'Step 2: Add a Profile Photo'}</h3>
        <p className="text-sm text-muted-foreground">A real photo increases trust and helps you get hired.</p>
        
        <div className="flex items-center justify-center w-full aspect-video bg-muted rounded-lg overflow-hidden relative">
            {photo ? (
                <img src={photo} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
                <>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {!hasCameraPermission && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                        <Camera className="h-10 w-10 mb-4" />
                        <p className="text-center">Camera access is required. Alternatively, you can upload a file.</p>
                    </div>
                )}
                </>
            )}
        </div>
        
        <div className="flex gap-2">
            {photo ? (
                <Button variant="outline" onClick={() => { setPhoto(null); startCamera(); }} className="w-full">Retake Photo</Button>
            ) : (
                <>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
                        <Camera className="mr-2 h-4 w-4" />
                        Capture
                    </Button>
                     <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                    </Button>
                </>
            )}
        </div>

        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(role === 'Job Giver' ? 'role' : 'verification')} className="w-full">Back</Button>
            <Button onClick={() => setCurrentStep("details")} className="w-full" disabled={!photo}>Next</Button>
        </div>
         <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );

  const renderDetailsStep = () => (
      <div className="space-y-4">
        <h3 className="font-semibold">{role === 'Job Giver' ? 'Step 3: Your Details' : 'Step 3: Your Details'}</h3>
        {verificationSubStep === 'verified' && (
             <Alert variant="success">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Aadhar Verified!</AlertTitle>
                <AlertDescription>Your Name, Mobile, and Address have been pre-filled. You can edit your current address if it's different.</AlertDescription>
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
        />
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep('photo')} className="w-full">Back</Button>
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
        {currentStep === "verification" && renderVerificationStep()}
        {currentStep === "photo" && renderPhotoStep()}
        {currentStep === "details" && renderDetailsStep()}
      </form>
    </Form>
  );
}

    