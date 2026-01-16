

"use client";

import { useForm, useWatch, Control } from "react-hook-form";
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
import { Zap, Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { generateJobDetails, generatePriceEstimate } from "@/ai/actions";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState, useCallback } from "react";
import { cn, toDate } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter, useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Job, JobAttachment, User, PlatformSettings } from "@/lib/types";
import { AddressForm } from "@/components/ui/address-form";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useHelp } from "@/hooks/use-help";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import debounce from "lodash.debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobCategoryTemplates } from "@/lib/job-category-templates";
import { VoiceInput } from "@/components/ui/voice-input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { DraftRecoveryDialog } from "@/components/post-job/draft-recovery-dialog";
import { TemplateSelector } from "@/components/post-job/template-selector";
import { SaveTemplateDialog } from "@/components/post-job/save-template-dialog";
import { BudgetTemplateSelector } from "@/components/post-job/budget-template-selector";
import { SmartEstimatorDialog } from "@/components/post-job/smart-estimator-dialog";
import { getLatestDraft, deleteDraft, JobDraft, JobTemplate, incrementTemplateUsage } from "@/lib/api/drafts";
import { Save, Check, Loader2 as Loader, Bookmark, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  jobCategory: z.string().min(1, { message: "Please select a job category." }),
  skills: z.string().min(1, { message: "Please provide at least one skill." }),
  travelTip: z.coerce.number().optional(),
  isGstInvoiceRequired: z.boolean().default(false),
  address: addressSchema,
  priceEstimate: z.object({
    min: z.coerce.number().min(1, "Budget must be positive"),
    max: z.coerce.number().min(1, "Budget must be positive"),
  }).optional(),
  deadline: z.string().refine((val) => {
    if (!val) return true; // Allow empty if direct awarding
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(val) >= today;
  }, {
    message: "Deadline cannot be in the past.",
  }).or(z.literal("")),
  jobStartDate: z.string().min(1, { message: "Please select a job start date." }),
  attachments: z.array(z.instanceof(File)).optional(),
  directAwardInstallerId: z.string().optional(),
}).refine(data => {
  if (data.directAwardInstallerId) {
    return !!data.priceEstimate && data.priceEstimate.min > 0;
  }
  return true;
}, {
  message: "A budget is required for a direct award.",
  path: ["priceEstimate.min"],
}).refine(data => {
  if (data.directAwardInstallerId) return true;
  return data.deadline !== "";
}, {
  message: "Bidding deadline is required for public jobs.",
  path: ["deadline"],
}).refine(data => {
  if (!data.deadline || !data.jobStartDate) return true;
  return new Date(data.jobStartDate) >= new Date(data.deadline);
}, {
  message: "Job start date cannot be before the bidding deadline.",
  path: ["jobStartDate"],
}).refine(data => {
  if (data.priceEstimate && data.priceEstimate.max > 0) {
    return data.priceEstimate.min <= data.priceEstimate.max;
  }
  return true;
}, {
  message: "Maximum budget cannot be less than minimum budget.",
  path: ["priceEstimate.max"],
});


function DirectAwardInput({ control }: { control: Control<any> }) {
  const { db } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInstaller, setSelectedInstaller] = useState<User | null>(null);

  const debouncedCheck = React.useMemo(() =>
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

  const installerId = useWatch({ control, name: "directAwardInstallerId" });

  useEffect(() => {
    if (installerId) {
      setIsLoading(true);
      debouncedCheck(installerId);
    }
  }, [installerId, debouncedCheck]);

  return (
    <FormField
      control={control}
      name="directAwardInstallerId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Installer&apos;s Public ID (Optional)</FormLabel>
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
            To send a private job request to a specific installer, paste their ID here. Public bidding will be disabled.
          </FormDescription>
          {isLoading && <p className="text-sm text-muted-foreground">Verifying ID...</p>}
          {selectedInstaller && !isLoading && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedInstaller.realAvatarUrl} alt={selectedInstaller.name} />
                <AvatarFallback>{selectedInstaller.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{selectedInstaller.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-600" /> Verified Installer</p>
              </div>
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function PostJobClient({ isMapLoaded }: { isMapLoaded: boolean }) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isEstimating, setIsEstimating] = React.useState(false); // New state for price estimation
  const { user, role, loading: userLoading } = useUser();
  const { db, storage } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapCenter, setMapCenter] = React.useState<{ lat: number, lng: number } | null>(null);
  const { setHelp } = useHelp();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Draft & Template state
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<JobDraft | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showSmartEstimator, setShowSmartEstimator] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    mode: "onChange",
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      jobCategory: "",
      skills: "",
      travelTip: 0,
      isGstInvoiceRequired: false,
      address: {
        house: "",
        street: "",
        landmark: "",
        cityPincode: "",
        fullAddress: "",
      },
      deadline: "",
      jobStartDate: "",
      attachments: [],
      directAwardInstallerId: "",
      priceEstimate: { min: 0, max: 0 },
    },
  });

  const repostJobId = searchParams.get('repostJobId');
  const editJobId = searchParams.get('editJobId');
  const directAwardParam = searchParams.get('directAwardInstallerId');
  const isEditMode = !!editJobId;

  // Auto-save hook
  const { saveStatus, draftId, saveNow, setDraftId } = useAutoSave(
    () => ({
      title: form.getValues('jobTitle'),
      description: form.getValues('jobDescription'),
      jobCategory: form.getValues('jobCategory'),
      skills: form.getValues('skills')?.split(',').map(s => s.trim()),
      budget: form.getValues('priceEstimate'),
      location: form.getValues('address.cityPincode'),
      address: form.getValues('address'),
      fullAddress: form.getValues('address.fullAddress'),
      jobStartDate: form.getValues('jobStartDate') ? new Date(form.getValues('jobStartDate')) : undefined,
      travelTip: form.getValues('travelTip'),
      directAwardInstallerId: form.getValues('directAwardInstallerId'),
      isGstInvoiceRequired: form.getValues('isGstInvoiceRequired'),
    }),
    {
      enabled: !isEditMode && !isSubmitted && !repostJobId,
      onSave: (id) => setDraftId(id),
    }
  );

  useEffect(() => {
    if (directAwardParam) {
      form.setValue('directAwardInstallerId', directAwardParam, { shouldValidate: true });
    }
  }, [directAwardParam, form]);

  // Load draft on mount (only for new jobs)
  useEffect(() => {
    async function checkForDraft() {
      if (isEditMode || repostJobId || !user || !db) return;

      const draft = await getLatestDraft(db, user.id);
      if (draft && !isSubmitted) {
        setLoadedDraft(draft);
        setShowDraftDialog(true);
      }
    }
    checkForDraft();
  }, [isEditMode, repostJobId, user, db, isSubmitted]);

  // Handle draft recovery
  const handleResumeDraft = useCallback(() => {
    if (!loadedDraft) return;

    form.reset({
      jobTitle: loadedDraft.title || '',
      jobDescription: loadedDraft.description || '',
      jobCategory: loadedDraft.jobCategory || '',
      skills: loadedDraft.skills?.join(', ') || '',
      travelTip: loadedDraft.travelTip || 0,
      isGstInvoiceRequired: loadedDraft.isGstInvoiceRequired || false,
      address: loadedDraft.address || form.getValues('address'),
      deadline: '',
      jobStartDate: loadedDraft.jobStartDate ? format(toDate(loadedDraft.jobStartDate), "yyyy-MM-dd'T'HH:mm") : '',
      directAwardInstallerId: loadedDraft.directAwardInstallerId || '',
      priceEstimate: loadedDraft.budget || { min: 0, max: 0 },
    });

    setDraftId(loadedDraft.id);
    setShowDraftDialog(false);
    toast({
      title: 'Draft loaded',
      description: 'Your previous work has been restored.',
    });
  }, [loadedDraft, form, setDraftId, toast]);

  const handleDiscardDraft = useCallback(async () => {
    if (!loadedDraft || !user || !db) return;

    await deleteDraft(db, user.id, loadedDraft.id);
    setShowDraftDialog(false);
    toast({
      title: 'Draft discarded',
      description: 'Starting with a fresh form.',
    });
  }, [loadedDraft, user, db, toast]);

  // Handle template selection
  const handleTemplateSelect = useCallback(async (template: JobTemplate) => {
    if (!user || !db) return;

    const fields = template.fields;
    form.reset({
      jobTitle: fields.title || '',
      jobDescription: fields.description || '',
      jobCategory: template.category,
      skills: fields.skills?.join(', ') || '',
      travelTip: fields.travelTip || 0,
      isGstInvoiceRequired: fields.isGstInvoiceRequired || false,
      address: fields.address || form.getValues('address'),
      deadline: '',
      jobStartDate: '',
      directAwardInstallerId: '',
      priceEstimate: fields.budget || { min: 0, max: 0 },
    });

    await incrementTemplateUsage(db, user.id, template.id);

    toast({
      title: 'Template loaded',
      description: `"${template.name}" has been applied.`,
    });
  }, [user, db, form, toast]);

  React.useEffect(() => {
    async function prefillForm() {
      const jobId = editJobId || repostJobId;
      if (jobId && db) {
        setIsProcessing(true);
        const jobRef = doc(db, 'jobs', jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          const jobData = jobSnap.data() as Job;

          if (isEditMode && jobData.status !== 'Open for Bidding') {
            toast({
              title: "Modification Restricted",
              description: "This job cannot be edited because it is already processed or awarded. Modifications are only allowed when the job is open for bidding.",
              variant: "destructive",
            });
            router.push(`/dashboard/jobs/${jobId}`);
            return;
          }
          form.reset({
            jobTitle: jobData.title,
            jobDescription: jobData.description,
            jobCategory: jobData.jobCategory,
            skills: (jobData.skills || []).join(', '),
            isGstInvoiceRequired: jobData.isGstInvoiceRequired,
            address: jobData.address,
            travelTip: jobData.travelTip || 0,
            deadline: isEditMode && jobData.deadline ? format(toDate(jobData.deadline), "yyyy-MM-dd") : "",
            jobStartDate: isEditMode && jobData.jobStartDate ? format(toDate(jobData.jobStartDate), "yyyy-MM-dd") : "",
            directAwardInstallerId: "", // Never prefill direct award
            priceEstimate: jobData.priceEstimate
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
  }, [editJobId, repostJobId, db, form, toast, isEditMode, router]);

  React.useEffect(() => {
    setHelp({
      title: isEditMode ? "Edit Job" : "Post a New Job",
      content: (
        <div className="space-y-4 text-sm">
          <p>Follow these steps to create a job listing and attract the best installers.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Budget:</span> Provide a realistic budget range. Use the &quot;AI Suggest&quot; button to get a fair market estimate based on your job details.</li>
            <li><span className="font-semibold">Job Category:</span> Selecting the right category is crucial. This determines the checklist installers must agree to when bidding.</li>
            <li><span className="font-semibold">AI-Powered Fields:</span> Use the &quot;AI Generate&quot; button next to the description to get a head start based on your job title.</li>
            <li><span className="font-semibold">Location & Address:</span> Start by typing your pincode to find your area, then use the map to pin your exact location. An accurate location is crucial.</li>
            <li><span className="font-semibold">Attachments:</span> Upload site photos, floor plans, or any other relevant documents to give installers a better understanding of the job.</li>
            {!isEditMode && <li><span className="font-semibold">Direct Award (Optional):</span> If you already know an installer on our platform, you can enter their public ID here to send them a private request to bid on this job.</li>}
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
  const jobCategory = useWatch({ control: form.control, name: "jobCategory" });
  const jobDescription = useWatch({ control: form.control, name: "jobDescription" });
  const directAwardInstallerId = useWatch({ control: form.control, name: "directAwardInstallerId" });
  const jobTitleState = form.getFieldState("jobTitle");
  const isJobTitleValid = jobTitle && !jobTitleState.invalid;

  // Validation for price estimate
  const canEstimatePrice = jobTitle && jobDescription && jobCategory && jobDescription.length >= 50;

  const handleGenerateDetails = async (overrideTitle?: string) => {
    const titleToUse = overrideTitle || jobTitle;

    if (!titleToUse || titleToUse.length < 10) {
      toast({
        title: "Invalid Job Title",
        description: "Please enter a job title (at least 10 characters) first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateJobDetails({ jobTitle: titleToUse });
      if (result) {
        form.setValue("jobDescription", result.jobDescription, { shouldValidate: true });
        form.setValue("skills", result.suggestedSkills.join(', '), { shouldValidate: true });

        toast({
          title: "AI Suggestions Added!",
          description: "Description and skills have been auto-filled.",
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

  const handleVoiceTranscript = async (transcript: string) => {
    form.setValue("jobTitle", transcript, { shouldValidate: true });

    // Slight delay to ensure state updates before triggering generation
    setTimeout(() => {
      handleGenerateDetails(transcript);
    }, 100);
  };

  const handleEstimatePrice = async () => {
    if (!canEstimatePrice) {
      toast({
        title: "More Details Required",
        description: "Please fill in the Job Title, Category, and a detailed Description before asking for a price estimate.",
        variant: "destructive"
      });
      return;
    }

    setIsEstimating(true);
    try {
      const result = await generatePriceEstimate({
        jobTitle,
        jobDescription,
        jobCategory
      });

      if (result && result.priceEstimate) {
        form.setValue("priceEstimate.min", result.priceEstimate.min, { shouldValidate: true });
        if (!directAwardInstallerId) {
          form.setValue("priceEstimate.max", result.priceEstimate.max, { shouldValidate: true });
        }

        toast({
          title: "Budget Estimated!",
          description: `AI suggests a range of ₹${result.priceEstimate.min} - ₹${result.priceEstimate.max}.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error estimating price:", error);
      toast({
        title: "Estimation Failed",
        description: "Could not generate a price estimate. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsEstimating(false);
    }
  };

  async function onSubmit(values: z.infer<typeof jobSchema>) {
    console.log("Form submission started with values:", values);

    if (!user || !db || !storage) {
      toast({ title: "Error", description: "You must be logged in to post a job.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const [pincode] = values.address.cityPincode.split(',');

    const jobData: Partial<Job> = {
      title: values.jobTitle,
      description: values.jobDescription,
      jobCategory: values.jobCategory,
      skills: values.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      travelTip: values.travelTip || 0,
      isGstInvoiceRequired: values.isGstInvoiceRequired,
      address: values.address,
      location: pincode.trim(),
      fullAddress: values.address.fullAddress,
      jobStartDate: new Date(values.jobStartDate),
    };

    if (values.priceEstimate) {
      jobData.priceEstimate = {
        min: values.priceEstimate.min,
        max: values.directAwardInstallerId ? values.priceEstimate.min : values.priceEstimate.max,
      };
    }

    try {
      if (isEditMode && editJobId) {
        jobData.deadline = new Date(values.deadline);
        jobData.bids = [];
        jobData.bidderIds = [];

        const jobRef = doc(db, "jobs", editJobId);
        await updateDoc(jobRef, jobData);
        toast({ title: "Job Updated Successfully!", description: "Existing bids have been cleared and bidders notified." });
        router.push(`/dashboard/jobs/${editJobId}`);

      } else {
        const today = new Date();
        const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newJobId = `JOB-${datePart}-${randomPart}`;

        console.log("Creating new job with ID:", newJobId);

        const attachmentUrls: JobAttachment[] = [];
        if (values.attachments && values.attachments.length > 0) {
          console.log(`Uploading ${values.attachments.length} attachments...`);
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
          console.log("Attachments uploaded successfully");
        }

        jobData.id = newJobId;
        jobData.jobGiver = doc(db, 'users', user.id);
        jobData.jobGiverId = user.id; // Add string ID for Firestore security rules
        jobData.status = "Open for Bidding";
        jobData.bids = [];
        jobData.comments = [];
        jobData.postedAt = new Date();
        jobData.attachments = attachmentUrls;

        if (values.directAwardInstallerId) {
          jobData.directAwardInstallerId = values.directAwardInstallerId;
          jobData.deadline = values.deadline ? new Date(values.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        } else {
          jobData.deadline = new Date(values.deadline);
        }

        console.log("Saving job to Firestore:", jobData);
        await setDoc(doc(db, "jobs", newJobId), jobData);
        console.log("Job saved successfully!");

        // Delete draft after successful submission
        setIsSubmitted(true);
        if (draftId && user && db) {
          await deleteDraft(db, user.id, draftId).catch(err =>
            console.error('Error deleting draft after submission:', err)
          );
        }

        toast({
          title: repostJobId ? "Job Re-posted Successfully!" : "Job Posted Successfully!",
          description: `Your job is now ${jobData.directAwardInstallerId ? 'sent privately to the installer' : 'live and open for bidding'}.`,
        });
        form.reset();
        console.log(`Redirecting to job detail page /dashboard/jobs/${newJobId}...`);
        router.push(`/dashboard/jobs/${newJobId}`);
      }
    } catch (error) {
      console.error("Error processing job:", error);

      // More detailed error message
      let errorDescription = "An error occurred while saving your job. Please try again.";
      if (error instanceof Error) {
        errorDescription = `Error: ${error.message}`;
        console.error("Error stack:", error.stack);
      }

      toast({
        title: "Failed to post job",
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      console.log("Form submission completed");
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
    return null;
  }

  const buttonText = isEditMode ? 'Save Changes' : (repostJobId ? 'Re-post Job' : 'Post Job');

  const handleSubmitClick = async () => {
    console.log("HandleSubmitClick triggered");
    // Check form validity before submission
    // If valid, submit the form
    form.handleSubmit(onSubmit, (errors) => {
      // Invalid handler
      console.error("Form validation errors:", errors);
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }

      toast({
        title: "Please check the form",
        description: "There are missing or invalid fields that require your attention.",
        variant: "destructive",
      });
    })();
  };

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4 px-4 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 text-xl font-semibold tracking-tight sm:grow-0 break-words" style={{ overflowWrap: 'anywhere' }}>
          {isEditMode ? 'Edit Job' : (repostJobId ? 'Re-post Job' : 'Post a New Job')}
        </h1>
        {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Details</CardTitle>
                  <CardDescription>
                    {isEditMode
                      ? "Update the details of your job posting."
                      : (repostJobId
                        ? "Review and update the job details, then set a new deadline to re-list it."
                        : "Fill in the details for your job posting. Use the AI generator for a quick start.")
                    }
                  </CardDescription>
                </div>
                {/* Save Status Indicator */}
                {!isEditMode && !repostJobId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {saveStatus === 'saving' && (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Saved</span>
                      </>
                    )}
                    {saveStatus === 'idle' && draftId && (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Draft auto-saved</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selector */}
              {!isEditMode && !repostJobId && (
                <TemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  onManageTemplates={() => router.push('/dashboard/templates')}
                />
              )}
              <FormField
                control={form.control}
                name="jobCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="job-category-select" className="h-12 md:h-10 text-base md:text-sm">
                          <SelectValue placeholder="Select a category for your job" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobCategoryTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This helps installers understand the scope of work.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="e.g., Install 8 IP Cameras for an Office"
                          {...field}
                          data-testid="job-title-input"
                          className="h-12 md:h-10 text-base md:text-sm"
                        />
                      </FormControl>
                      <VoiceInput onTranscript={handleVoiceTranscript} isProcessing={isGenerating} />
                    </div>
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
                        onClick={() => handleGenerateDetails()}
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
                        className={cn("min-h-32 text-base md:text-sm", isGenerating && "opacity-50")}
                        {...field}
                        data-testid="job-description-input"
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
                        className={cn(isGenerating && "opacity-50", "h-12 md:h-10 text-base md:text-sm")}
                        {...field}
                        data-testid="skills-input"
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
                        <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} disabled={!!directAwardInstallerId} data-testid="job-deadline-input" />
                      </FormControl>
                      <FormDescription>Not applicable for direct awards.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Work Start Date & Time</FormLabel>
                      <FormControl>
                        {/* Phase 12: Upgrade to datetime-local to capture hour precision */}
                        <Input
                          type="datetime-local"
                          {...field}
                          min={new Date().toISOString().slice(0, 16)}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                          onChange={field.onChange}
                          data-testid="job-start-date-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="travelTip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Tip (₹, Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 500" {...field} />
                      </FormControl>
                      <FormDescription>
                        Attract more bids by offering a commission-free travel tip.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Budget</CardTitle>
                  <CardDescription>
                    {directAwardInstallerId ? "Set the budget you are offering for this private job." : "Provide an estimated budget range to attract relevant bids."}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSmartEstimator(true)}
                  disabled={!canEstimatePrice}
                  className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Estimate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Template Selector */}
              {!directAwardInstallerId && (
                <div className="flex justify-end">
                  <BudgetTemplateSelector
                    onSelect={(template) => {
                      form.setValue('priceEstimate.min', template.min, { shouldValidate: true });
                      form.setValue('priceEstimate.max', template.max, { shouldValidate: true });
                      toast({ title: "Budget Applied", description: `Applied "${template.name}" range.` });
                    }}
                    currentValues={{
                      min: form.watch('priceEstimate.min') || 0,
                      max: form.watch('priceEstimate.max') || 0
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="priceEstimate.min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{directAwardInstallerId ? 'Offered Budget (₹)' : 'Minimum Budget (₹)'}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 8000" {...field} data-testid="min-budget-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!directAwardInstallerId && (
                  <FormField
                    control={form.control}
                    name="priceEstimate.max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Budget (₹, Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 12000" {...field} data-testid="max-budget-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          {!isEditMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Direct Request (Optional)
                </CardTitle>
                <CardDescription>
                  Know an installer you trust? Send a private request for them to bid on this job.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DirectAwardInput control={form.control} />
              </CardContent>
            </Card>
          )}
          <div className="flex items-center justify-between">
            <div>
              {/* Save as Template Button */}
              {!isEditMode && jobCategory && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveTemplateDialog(true)}
                  disabled={isProcessing}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save as Template
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              {isEditMode ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" disabled={isProcessing || isGenerating}>
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
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
                      <AlertDialogAction onClick={handleSubmitClick}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm & Save"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  type="button"
                  disabled={isProcessing || isGenerating}
                  onClick={handleSubmitClick}
                  data-testid="post-job-button"
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {repostJobId ? 'Re-post Job' : 'Post Job'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Draft Recovery Dialog */}
      <DraftRecoveryDialog
        open={showDraftDialog}
        draft={loadedDraft}
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
        onCancel={() => setShowDraftDialog(false)}
      />

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        draftData={{
          title: form.getValues('jobTitle'),
          description: form.getValues('jobDescription'),
          jobCategory: form.getValues('jobCategory'),
          skills: form.getValues('skills')?.split(',').map(s => s.trim()),
          budget: form.getValues('priceEstimate'),
          travelTip: form.getValues('travelTip'),
          isGstInvoiceRequired: form.getValues('isGstInvoiceRequired'),
        }}
        category={form.getValues('jobCategory')}
      />

      {/* Smart Estimator Dialog */}
      <SmartEstimatorDialog
        open={showSmartEstimator}
        onOpenChange={setShowSmartEstimator}
        jobDetails={{
          title: jobTitle,
          description: jobDescription,
          category: jobCategory
        }}
        onApply={(min, max) => {
          form.setValue('priceEstimate.min', min, { shouldValidate: true });
          if (!directAwardInstallerId) {
            form.setValue('priceEstimate.max', max, { shouldValidate: true });
          }
        }}
      />
    </div>
  );
}
