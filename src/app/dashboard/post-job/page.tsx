
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
import { Zap, Loader2, UserPlus, CheckCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { generateJobDetails } from "@/ai/flows/generate-job-details";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter, useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Job, JobAttachment, User } from "@/lib/types";
import { AddressForm } from "@/components/ui/address-form";
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, startAt, orderBy, updateDoc } from "firebase/firestore";
import { useHelp } from "@/hooks/use-help";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import debounce from "lodash.debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns";


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
  isGstInvoiceRequired: z.boolean().default(false),
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
});

function DirectAwardInput({ control }) {
    const { db } = useFirebase();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedInstaller, setSelectedInstaller] = useState<User | null>(null);
    const { getValues } = useFormContext();

    const debouncedCheck = useCallback(
        debounce(async (id: string) => {
            if (!id) {
                setSelectedInstaller(null);
                setIsLoading(false);
                return;
            }
            const userRef = doc(db, "users", id);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().roles.includes('Installer') && userSnap.data().installerProfile?.verified) {
                setSelectedInstaller(userSnap.data() as User);
            } else {
                setSelectedInstaller(null);
            }
            setIsLoading(false);
        }, 500),
        [db]
    );

    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setIsLoading(true);
        debouncedCheck(value);
    };

    return (
        <FormField
            control={control}
            name="directAwardInstallerId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Installer's Public ID (Optional)</FormLabel>
                    <FormControl>
                         <Input
                            placeholder="Paste installer's public ID here..."
                            {...field}
                            onChange={(e) => {
                                field.onChange(e);
                                handleIdChange(e);
                            }}
                        />
                    </FormControl>
                    <FormDescription>
                        If you fill this in, the job will be private and only visible to this installer. Public bidding will be disabled.
                    </FormDescription>
                    {isLoading && <p className="text-sm text-muted-foreground">Verifying ID...</p>}
                    {selectedInstaller && !isLoading && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                             <Avatar className="h-9 w-9">
                                <AvatarImage src={selectedInstaller.realAvatarUrl} alt={selectedInstaller.name} />
                                <AvatarFallback>{selectedInstaller.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm">{selectedInstaller.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-600"/> Verified Installer</p>
                            </div>
                        </div>
                     )}
                     {!selectedInstaller && getValues('directAwardInstallerId') && !isLoading && (
                         <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                             <p className="text-sm font-medium">No verified installer found for this ID.</p>
                         </div>
                     )}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default function PostJobPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { user, role, loading: userLoading } = useUser();
  const { db, storage } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapCenter, setMapCenter] = React.useState<{lat: number, lng: number} | null>(null);
  const { setHelp } = useHelp();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    mode: "onChange",
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      skills: "",
      isGstInvoiceRequired: false,
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
  
  const repostJobId = searchParams.get('repostJobId');
  const editJobId = searchParams.get('editJobId');
  const isEditMode = !!editJobId;

  React.useEffect(() => {
    async function prefillForm() {
        const jobId = editJobId || repostJobId;
        if (jobId && db) {
            setIsProcessing(true);
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);
            if (jobSnap.exists()) {
                const jobData = jobSnap.data() as Job;
                form.reset({
                    jobTitle: jobData.title,
                    jobDescription: jobData.description,
                    skills: (jobData.skills || []).join(', '),
                    isGstInvoiceRequired: jobData.isGstInvoiceRequired,
                    address: jobData.address,
                    budgetMin: jobData.budget.min,
                    budgetMax: jobData.budget.max,
                    deadline: isEditMode ? format(toDate(jobData.deadline), "yyyy-MM-dd") : "",
                    jobStartDate: jobData.jobStartDate ? format(toDate(jobData.jobStartDate), "yyyy-MM-dd") : "",
                    directAwardInstallerId: "", // Never prefill direct award
                });
                
                const toastTitle = isEditMode ? "Editing Job" : "Re-posting Job";
                const toastDescription = isEditMode
                    ? "You are now editing an existing job posting."
                    : "Job details have been pre-filled. Please set a new deadline.";

                toast({ title: toastTitle, description: toastDescription });
            } else {
                 toast({ title: "Error", description: "Could not find the original job to load.", variant: "destructive" });
            }
            setIsProcessing(false);
        }
    }
    prefillForm();
  }, [editJobId, repostJobId, db, form, toast, isEditMode]);

  React.useEffect(() => {
    setHelp({
        title: isEditMode ? "Edit Job" : "Post a New Job",
        content: (
            <div className="space-y-4 text-sm">
                <p>Follow these steps to create a job listing and attract the best installers.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Job Title:</span> Write a clear and concise title. This is the first thing installers see.</li>
                    <li><span className="font-semibold">AI Generate:</span> After writing a title, click the "AI Generate" button. Our AI will write a professional job description, suggest required skills, and estimate a fair budget for you.</li>
                    <li><span className="font-semibold">Location & Address:</span> Start by typing your pincode to find your area, then use the map to pin your exact location. An accurate location is crucial.</li>
                    <li><span className="font-semibold">Attachments:</span> Upload site photos, floor plans, or any other relevant documents to give installers a better understanding of the job.</li>
                    <li><span className="font-semibold">Dates & Budget:</span> Set your bidding deadline, the date you want work to start, and your budget range.</li>
                    {!isEditMode && <li><span className="font-semibold">Direct Award (Optional):</span> If you already know an installer on our platform, you can enter their public ID here to award the job to them directly, skipping the public bidding process.</li>}
                </ul>
            </div>
        )
    })
  }, [setHelp, isEditMode]);

  useEffect(() => {
    if (!userLoading && role !== 'Job Giver') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

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
    
    setIsProcessing(true);

    const [pincode] = values.address.cityPincode.split(',');
    
    const jobData: any = { 
        title: values.jobTitle,
        description: values.jobDescription,
        skills: values.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        isGstInvoiceRequired: values.isGstInvoiceRequired,
        address: values.address,
        budget: {
            min: values.budgetMin,
            max: values.budgetMax,
        },
        location: pincode.trim(),
        fullAddress: values.address.fullAddress,
        jobStartDate: new Date(values.jobStartDate),
    };

    try {
        if (isEditMode && editJobId) {
            jobData.deadline = new Date(values.deadline);
            // In edit mode, we clear existing bids to ensure fairness
            jobData.bids = [];
            jobData.bidderIds = [];
            
            const jobRef = doc(db, "jobs", editJobId);
            await updateDoc(jobRef, jobData);
            toast({ title: "Job Updated Successfully!", description: "Existing bids have been cleared and bidders notified." });
            router.push(`/dashboard/jobs/${editJobId}`);

        } else {
             // Create new job logic
            const today = new Date();
            const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newJobId = `JOB-${datePart}-${randomPart}`;
            
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

            jobData.id = newJobId;
            jobData.jobGiver = doc(db, 'users', user.id);
            jobData.status = values.directAwardInstallerId ? "Awarded" : "Open for Bidding";
            jobData.bids = [];
            jobData.comments = [];
            jobData.postedAt = new Date();
            jobData.attachments = attachmentUrls;
            jobData.completionOtp = Math.floor(100000 + Math.random() * 900000).toString();

            if (values.directAwardInstallerId) {
                const acceptanceDeadline = new Date();
                acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);
                jobData.awardedInstaller = doc(db, 'users', values.directAwardInstallerId);
                jobData.deadline = new Date(); // Set deadline to now for direct award
                jobData.acceptanceDeadline = acceptanceDeadline;
            } else {
                jobData.deadline = new Date(values.deadline);
            }
            
            await setDoc(doc(db, "jobs", newJobId), jobData);
            toast({
                title: repostJobId ? "Job Re-posted Successfully!" : "Job Posted Successfully!",
                description: `Your job is now ${jobData.status === 'Awarded' ? 'awarded' : 'live and open for bidding'}.`,
            });
            form.reset();
            router.push(`/dashboard/posted-jobs`);
        }
    } catch (error) {
        console.error("Error processing job:", error);
        toast({
            title: "Failed to post job",
            description: "An error occurred while saving your job. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
    }
  }

  if (userLoading || (isEditMode && isProcessing)) {
    return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }
  
   if (!userLoading && role !== 'Job Giver') {
    return null; // Redirect is handled by the hook
  }
  
  const SubmitButton = () => {
    const buttonText = isEditMode ? 'Save Changes' : (repostJobId ? 'Re-post Job' : 'Post Job');
    
    if (isEditMode) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={isProcessing || isGenerating}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {buttonText}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to save changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Editing a live job will remove all existing bids to ensure fairness. Previous bidders will be notified and will need to bid again on the updated job details. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm & Save"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    }

    return (
        <Button type="submit" disabled={isProcessing || isGenerating} onClick={form.handleSubmit(onSubmit)}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
        </Button>
    )
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          {isEditMode ? 'Edit Job' : (repostJobId ? 'Re-post Job' : 'Post a New Job')}
        </h1>
        {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                {isEditMode 
                    ? "Update the details of your job posting."
                    : (repostJobId 
                        ? "Review and update the job details, then set a new deadline to re-list it."
                        : "Fill in the details for your job posting. Use the AI generator for a quick start.")
                }
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
                name="isGstInvoiceRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        GST Invoice Required
                      </FormLabel>
                      <FormDescription>
                        Select this if you are a business and require a GST invoice for this job.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
               {!isEditMode && (
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
               )}
              <Separator />
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
                         <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} />
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
           {!isEditMode && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Direct Award (Optional)
                        </CardTitle>
                        <CardDescription>
                            Know an installer you trust? Enter their public ID to award the job directly to them, skipping the public bidding process.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DirectAwardInput control={form.control} />
                    </CardContent>
                </Card>
           )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </Form>
    </div>
  );
}
