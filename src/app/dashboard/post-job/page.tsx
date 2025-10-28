"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Loader2, UserPlus } from "lucide-react";
import { generateJobDetails } from "@/ai/flows/generate-job-details";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { JobAttachment } from "@/lib/types";
import { AddressForm } from "@/components/ui/address-form";
import { doc, setDoc } from "firebase/firestore";
import { useHelp } from "@/hooks/use-help";
import { FileUpload } from "@/components/ui/file-upload";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const addressSchema = z.object({
  house: z.string().min(3, "Please enter a valid house/building detail."),
  street: z.string().min(3, "Please enter a valid street/area."),
  landmark: z.string().optional(),
  cityPincode: z.string().min(8, "Please select a pincode and post office."),
  fullAddress: z.string().min(10, { message: "Please set a precise location on the map." }),
});

const jobSchema = z.object({
  jobTitle: z
    .string()
    .min(10, { message: "Job title must be at least 10 characters." }),
  jobDescription: z
    .string()
    .min(50, { message: "Description must be at least 50 characters." }),
  skills: z.string().min(1, { message: "Please provide at least one skill." }),
  address: addressSchema,
  budgetMin: z.coerce.number().min(1, { message: "Minimum budget must be at least 1." }),
  budgetMax: z.coerce.number().min(1, { message: "Maximum budget must be at least 1." }),
  deadline: z.string().refine((val) => new Date(val) > new Date(), {
    message: "Deadline must be in the future.",
  }).or(z.literal(""))
  ,
  jobStartDate: z.string().min(1, { message: "Please select a job start date." }),
  attachments: z.array(z.instanceof(File)).optional(),
  directAwardInstallerId: z.string().optional(),
}).refine(data => data.budgetMax > data.budgetMin, {
    message: "Maximum budget must be greater than minimum budget.",
    path: ["budgetMax"],
}).refine(data => {
    if (data.directAwardInstallerId) return true;
    return data.deadline !== "";
}, {
    message: "Bidding deadline is required unless you are using Direct Award.",
    path: ["deadline"],
}).refine(data => {
    if (!data.deadline) return true; // Skip if no deadline (direct award)
    return new Date(data.jobStartDate) >= new Date(data.deadline);
}, {
    message: "Job start date must be on or after the bidding deadline.",
    path: ["jobStartDate"],
});

export default function PostJobPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { user, role, loading: userLoading } = useUser();
  const { db, storage } = useFirebase();
  const router = useRouter();
  const [mapCenter, setMapCenter] = React.useState<{lat: number, lng: number} | null>(null);
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
        title: "Post a New Job",
        content: (
            <div className="space-y-4 text-sm">
                <p>Follow these steps to create a job listing and attract the best installers.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Job Title:</span> Write a clear and concise title. This is the first thing installers see.</li>
                    <li><span className="font-semibold">AI Generate:</span> After writing a title, click the "AI Generate" button. Our AI will write a professional job description, suggest required skills, and estimate a fair budget for you.</li>
                    <li><span className="font-semibold">Location & Address:</span> Start by typing your pincode to find your area, then use the map to pin your exact location. An accurate location is crucial.</li>
                    <li><span className="font-semibold">Attachments:</span> Upload site photos, floor plans, or any other relevant documents to give installers a better understanding of the job.</li>
                    <li><span className="font-semibold">Dates & Budget:</span> Set your bidding deadline, the date you want work to start, and your budget range.</li>
                    <li><span className="font-semibold">Direct Award (Optional):</span> If you already know an installer on our platform, you can enter their public ID here to award the job to them directly, skipping the public bidding process.</li>
                </ul>
            </div>
        )
    })
  }, [setHelp]);

  useEffect(() => {
    if (!userLoading && role !== 'Job Giver') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    mode: "onChange",
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      skills: "",
      address: {
        house: "",
        street: "",
        landmark: "",
        cityPincode: "",
        fullAddress: "",
      },
      budgetMin: 0,
      budgetMax: 0,
      deadline: "",
      jobStartDate: "",
      attachments: [],
      directAwardInstallerId: "",
    },
  });

  const jobTitle = useWatch({ control: form.control, name: "jobTitle" });
  const directAwardInstallerId = useWatch({ control: form.control, name: "directAwardInstallerId" });
  const jobTitleState = form.getFieldState("jobTitle");
  const isJobTitleValid = jobTitle && !jobTitleState.invalid;

  const handleGenerateDetails = async () => {
    if (!isJobTitleValid) {
      toast({
        title: "Invalid Job Title",
        description: "Please enter a job title (at least 10 characters) first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateJobDetails({ jobTitle });
      if (result) {
        form.setValue("jobDescription", result.jobDescription, { shouldValidate: true });
        form.setValue("skills", result.suggestedSkills.join(', '), { shouldValidate: true });
        form.setValue("budgetMin", result.budgetMin, { shouldValidate: true });
        form.setValue("budgetMax", result.budgetMax, { shouldValidate: true });

        toast({
          title: "AI Suggestions Added!",
          description: "Description, skills, and budget have been auto-filled.",
        });
      }
    } catch (error) {
      console.error("Error generating job details:", error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  async function onSubmit(values: z.infer<typeof jobSchema>) {
    if (!user || !db || !storage) {
        toast({ title: "Error", description: "You must be logged in to post a job.", variant: "destructive" });
        return;
    }
    
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newJobId = `JOB-${datePart}-${randomPart}`;
    
    // 1. Upload attachments to Firebase Storage
    const attachmentUrls: JobAttachment[] = [];
    if (values.attachments && values.attachments.length > 0) {
      for (const file of values.attachments) {
        const fileRef = ref(storage, `jobs/${newJobId}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        attachmentUrls.push({
          fileName: file.name,
          fileUrl: downloadURL,
          fileType: file.type,
        });
      }
    }
    
    const status = values.directAwardInstallerId ? "Awarded" : "Open for Bidding";
    const [pincode] = values.address.cityPincode.split(',');

    const jobData: any = { 
        id: newJobId, 
        title: values.jobTitle,
        description: values.jobDescription,
        skills: values.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        address: values.address,
        budget: {
            min: values.budgetMin,
            max: values.budgetMax,
        },
        location: pincode.trim(),
        fullAddress: values.address.fullAddress,
        jobGiver: doc(db, 'users', user.id),
        status,
        bids: [],
        comments: [],
        postedAt: new Date(),
        attachments: attachmentUrls,
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
        jobStartDate: new Date(values.jobStartDate),
    };

    if (values.directAwardInstallerId) {
        jobData.awardedInstaller = doc(db, 'users', values.directAwardInstallerId);
        jobData.deadline = new Date(); // Set deadline to now for direct award
    } else {
        jobData.deadline = new Date(values.deadline);
    }
    
    try {
        await setDoc(doc(db, "jobs", newJobId), jobData);
        toast({
            title: "Job Posted Successfully!",
            description: `Your job is now ${status === 'Awarded' ? 'awarded' : 'live and open for bidding'}.`,
        });
        form.reset();
        router.push(`/dashboard/posted-jobs`);
    } catch (error) {
        console.error("Error posting job:", error);
        toast({
            title: "Failed to post job",
            description: "An error occurred while saving your job. Please try again.",
            variant: "destructive",
        });
    }
  }

  if (userLoading || role !== 'Job Giver') {
    return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Post a New Job
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Fill in the details for your job posting. Use the AI generator for a quick start.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Install 8 IP Cameras for an Office"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Job Description</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateDetails}
                        disabled={isGenerating || !isJobTitleValid}
                      >
                        {isGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        AI Generate
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project requirements, scope, and any important details..."
                        className={cn("min-h-32", isGenerating && "opacity-50")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex items-center justify-between">
                        <FormLabel>Required Skills</FormLabel>
                         {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                     </div>
                    <FormControl>
                      <Input
                        placeholder="e.g., IP Cameras, NVR Setup, Cabling"
                        className={cn(isGenerating && "opacity-50")}
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>
                      Enter a comma-separated list of skills.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachments</FormLabel>
                     <FormControl>
                       <FileUpload 
                          onFilesChange={(files) => field.onChange(files)} 
                          maxFiles={5}
                        />
                    </FormControl>
                    <FormDescription>Upload site photos, floor plans, or other relevant documents (max 5 files).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
               <AddressForm
                  pincodeName="address.cityPincode"
                  houseName="address.house"
                  streetName="address.street"
                  landmarkName="address.landmark"
                  fullAddressName="address.fullAddress"
                  onLocationGeocoded={setMapCenter}
                  mapCenter={mapCenter}
                  isMapLoaded={true}
                />
                 <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bidding Deadline</FormLabel>
                        <FormControl>
                         <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} disabled={!!directAwardInstallerId} />
                        </FormControl>
                         <FormDescription>Not applicable if you are using Direct Award.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="jobStartDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Job Work Start Date</FormLabel>
                        <FormControl>
                         <Input type="date" {...field} min={form.getValues('deadline') || new Date().toISOString().split("T")[0]} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="budgetMin"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Minimum Budget (₹)</FormLabel>                         {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} className={cn(isGenerating && "opacity-50")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budgetMax"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Maximum Budget (₹)</FormLabel>
                        {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 20000" {...field} className={cn(isGenerating && "opacity-50")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Direct Award (Optional)
                    </CardTitle>
                    <CardDescription>
                        Know a great installer? Skip the bidding process and award this job directly to them by entering their public Installer ID.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name="directAwardInstallerId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Installer's Public ID</FormLabel>
                            <FormControl>
                            <Input
                                placeholder="e.g., INSTALLER-20240315-0003"
                                {...field}
                            />
                            </FormControl>
                             <FormDescription>
                                If you fill this in, the job will be private and only visible to this installer. Public bidding will be disabled.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || isGenerating}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Job
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
