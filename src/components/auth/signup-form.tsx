
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { users } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { User } from "@/lib/types";
import {
  initiateAadharVerification,
  confirmAadharVerification,
  ConfirmAadharOutput,
} from "@/ai/flows/aadhar-verification";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).refine(email => {
    return !users.some(user => user.email.toLowerCase() === email.toLowerCase());
  }, {
    message: "This email is already in use.",
  }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["Job Giver", "Installer"]),
  mobile: z.string().regex(/^\d{10}$/, { message: "Must be a 10-digit mobile number." }),
  pincode: z.string().regex(/^\d{6}$/, { message: "Must be a 6-digit pincode." }),
  aadhar: z.string().optional(),
  otp: z.string().optional(),
});


export function SignUpForm() {
  const router = useRouter();
  const { login } = useUser();
  const { toast } = useToast();
  
  const [verificationStep, setVerificationStep] = useState<"enterAadhar" | "enterOtp" | "verified">("enterAadhar");
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycData, setKycData] = useState<ConfirmAadharOutput['kycData'] | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: undefined,
      mobile: "",
      pincode: "",
      aadhar: "",
      otp: "",
    },
  });
  
  const role = form.watch("role");
  const aadharValue = form.watch("aadhar");

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
        setVerificationStep("enterOtp");
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
      const result = await confirmAadharVerification({ transactionId, otp: otp || "" });
      if (result.isVerified) {
        setVerificationStep("verified");
        toast({
          title: "Verification Successful!",
          description: "Your KYC data has been pre-filled.",
          variant: "success",
        });
        form.clearErrors("aadhar");

        if (result.kycData) {
            setKycData(result.kycData);
            form.setValue("name", result.kycData.name, { shouldValidate: true });
            form.setValue("mobile", result.kycData.mobile, { shouldValidate: true });
            form.setValue("pincode", result.kycData.pincode, { shouldValidate: true });
        }
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


  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.role === 'Installer' && verificationStep !== 'verified') {
        form.setError("aadhar", { type: "manual", message: "Please complete Aadhar verification." });
        return;
    }
    
    const newUserId = `user-${users.length + 1}`;
    const newAnonymousId = `${values.role === 'Installer' ? 'Installer' : 'JobGiver'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
    
    const newUser: User = {
      id: newUserId,
      name: values.name,
      email: values.email,
      mobile: values.mobile,
      anonymousId: newAnonymousId,
      pincode: values.pincode || '',
      roles: [values.role],
      memberSince: new Date(),
      avatarUrl: randomAvatar.imageUrl,
      realAvatarUrl: `https://picsum.photos/seed/${values.name.split(' ')[0]}/100/100`,
    };

    if (values.role === 'Installer') {
      newUser.installerProfile = {
        tier: 'Bronze',
        points: 0,
        skills: [],
        rating: 0,
        reviews: 0,
        verified: verificationStep === 'verified',
        reputationHistory: [],
        aadharData: kycData ? { ...kycData } : undefined,
      };
    }

    users.push(newUser);
    login(values.email);
    router.push("/dashboard");
  }

  const isAadharValid = aadharValue && /^\d{12}$/.test(aadharValue) && form.getFieldState('aadhar').isDirty && !form.getFieldState('aadhar').invalid;
  const isOtpValid = form.watch('otp') && /^\d{6}$/.test(form.watch('otp')!);

  const renderInstallerForm = () => {
    if (verificationStep !== 'verified') {
        return (
            <div className="space-y-4 rounded-lg border p-4">
                 <FormLabel className="text-base font-semibold">
                    Step 1: Aadhar Verification
                </FormLabel>
                <FormDescription>
                    Installers must complete KYC verification. This ensures a trustworthy platform for everyone.
                </FormDescription>

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
                                        disabled={verificationStep !== 'enterAadhar'}
                                    />
                                </FormControl>
                                {verificationStep === 'enterAadhar' && (
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

                {verificationStep === "enterOtp" && (
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
            </div>
        )
    }

    return (
        <>
            <Alert variant="success" className="mb-4">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Aadhar Verified Successfully!</AlertTitle>
                <AlertDescription>
                    Please complete your profile. The details from your Aadhar have been pre-filled but can be edited if needed.
                </AlertDescription>
            </Alert>
             <FormLabel className="text-base font-semibold">
                Step 2: Complete Your Profile
            </FormLabel>
            <div className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Full Name (as per Aadhar)</FormLabel>
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
                    <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 110001" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full">
                        Create Account
                    </Button>
            </div>
        </>
    )
  }

  const renderJobGiverForm = () => (
      <div className="space-y-4">
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
        <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Pincode</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., 110001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        <Button type="submit" className="w-full">
          Create Account
        </Button>
      </div>
  )


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
            <FormItem>
                <FormLabel>I am a...</FormLabel>
                <Select
                onValueChange={(value) => {
                    field.onChange(value);
                }}
                defaultValue={field.value}
                >
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="Job Giver">Job Giver</SelectItem>
                    <SelectItem value="Installer">Installer</SelectItem>
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        
        {role === "Installer" && renderInstallerForm()}
        {role === "Job Giver" && renderJobGiverForm()}

      </form>
    </Form>
  );
}
