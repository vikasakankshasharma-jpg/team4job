"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding-store";
import { BasicInfo } from "./steps/basic-info";
import { Experience } from "./steps/experience";
import { Documents } from "./steps/documents";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Placeholder steps
const steps = [
    { id: 1, name: "Basic Info" },
    { id: 2, name: "Experience & Skills" },
    { id: 3, name: "Documents (KYC)" },
    { id: 4, name: "Review" }
];

export function OnboardingWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    // Connect to store
    const data = useOnboardingStore();
    const updateData = useOnboardingStore((state) => state.updateData);
    const resetStore = useOnboardingStore((state) => state.reset);

    const nextStep = () => {
        // Basic validation could go here
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
        window.scrollTo(0, 0);
    };

    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Prepare FormData for file upload
            const formData = new FormData();
            formData.append('firstName', data.firstName);
            formData.append('lastName', data.lastName);
            formData.append('shopName', data.shopName);
            formData.append('city', data.city);
            formData.append('pincode', data.pincode);
            formData.append('experience', data.experience);
            formData.append('skills', JSON.stringify(data.skills));

            if (data.aadharFront) formData.append('aadharFront', data.aadharFront);
            if (data.aadharBack) formData.append('aadharBack', data.aadharBack);
            if (data.panCard) formData.append('panCard', data.panCard);
            if (data.profilePhoto) formData.append('profilePhoto', data.profilePhoto);

            // Get current user token
            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            const response = await fetch('/api/onboarding/submit', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Submission failed');

            toast({
                title: "Application Submitted!",
                description: "Your profile is under review. We will notify you once verified.",
            });

            resetStore(); // Clear local state
            router.push('/dashboard');

        } catch (error) {
            console.error(error);
            toast({
                title: "Submission Failed",
                description: "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Progress Bar */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 z-0" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />
                <div className="relative z-10 flex justify-between">
                    {steps.map((step) => (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${step.id <= currentStep
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-muted"
                                    }`}
                            >
                                {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${step.id <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                                {step.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <Card>
                <CardContent className="p-6 min-h-[400px]">
                    {currentStep === 1 && <BasicInfo data={data} updateData={updateData} />}
                    {currentStep === 2 && <Experience data={data} updateData={updateData} />}
                    {currentStep === 3 && <Documents data={data} updateData={updateData} />}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Review Your Details</h2>
                            <div className="grid md:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-muted-foreground">Basic Info</h3>
                                    <p><span className="font-medium">Name:</span> {data.firstName} {data.lastName}</p>
                                    <p><span className="font-medium">City:</span> {data.city} ({data.pincode})</p>
                                    <p><span className="font-medium">Shop:</span> {data.shopName || "N/A"}</p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-muted-foreground">Experience</h3>
                                    <p><span className="font-medium">Years:</span> {data.experience}</p>
                                    <p><span className="font-medium">Skills:</span> {data.skills.join(", ") || "None selected"}</p>
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 flex gap-3 text-yellow-800 dark:text-yellow-200">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-semibold">Pending Verification</p>
                                    <p>Once submitted, our team will verify your documents (Aadhar/PAN). This usually takes 24-48 hours.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || isSubmitting}>
                    Back
                </Button>
                {currentStep === steps.length ? (
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Application
                    </Button>
                ) : (
                    <Button onClick={nextStep}>Next</Button>
                )}
            </div>
        </div>
    );
}
