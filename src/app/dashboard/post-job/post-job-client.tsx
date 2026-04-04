

"use client";

import { useForm, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
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
import { generateJobDescriptionAction, generatePriceEstimateAction } from "@/app/actions/ai.actions";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { cn, toDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Job, JobAttachment, User, PlatformSettings } from "@/lib/types";
import { AddressForm } from "@/components/ui/address-form";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useHelp } from "@/hooks/use-help";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import debounce from "lodash.debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logActivity } from "@/lib/activity-logger";
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
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobCategoryTemplates } from "@/lib/job-category-templates";
import { VoiceInput } from "@/components/ui/voice-input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useFeatureFlag } from "@/lib/feature-flags-client";
import { DraftRecoveryDialog } from "@/components/post-job/draft-recovery-dialog";
import { TemplateSelector } from "@/components/post-job/template-selector";
import { SaveTemplateDialog } from "@/components/post-job/save-template-dialog";
import { BudgetTemplateSelector } from "@/components/post-job/budget-template-selector";
import { SmartEstimatorDialog } from "@/components/post-job/smart-estimator-dialog";
import { JobDraft, JobTemplate } from "@/lib/api/drafts";
import { getLatestDraftAction, deleteDraftAction, incrementTemplateUsageAction } from "@/app/actions/draft.actions";
import { Save, Check, Loader2 as Loader, Bookmark, Sparkles } from "lucide-react";
import { createJobAction, updateJobAction, getJobForEditAction } from "@/app/actions/job.actions";
import { CreateJobInput } from "@/domains/jobs/job.types";
import { Badge } from "@/components/ui/badge";
import { AIFeedbackControl } from "@/components/ai/AIFeedbackControl";
import { compressImage } from "@/lib/image-compression";

const addressSchema = z.object({
  house: z.string().min(3, "address.houseReq"),
  street: z.string().min(3, "address.streetReq"),
  landmark: z.string().optional(),
  cityPincode: z.string().min(6, "address.pincodeReq"),
  fullAddress: z.string().min(10, { message: "address.locationReq" }),
});

const optionalPositiveNumber = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = typeof val === "string" ? Number(val) : val;
  if (typeof n !== "number" || Number.isNaN(n) || n === 0) return undefined;
  return n;
}, z.number().min(1, "validation.budgetPos"));

const priceEstimateSchema = z.object({
  min: z.coerce.number().min(1, "validation.budgetPos"),
  max: optionalPositiveNumber.optional(),
});

const jobSchema = z.object({
  jobTitle: z
    .string()
    .min(10, { message: "validation.titleMin" }),
  jobDescription: z
    .string()
    .min(50, { message: "validation.descMin" }),
  jobCategory: z.string().min(1, { message: "validation.categoryReq" }),
  skills: z.string().min(1, { message: "validation.skillsReq" }),
  travelTip: z.coerce.number().optional(),
  isGstInvoiceRequired: z.boolean().default(false),
  address: addressSchema,
  priceEstimate: priceEstimateSchema.optional(),
  deadline: z.string().refine((val) => {
    if (!val) return true; // Allow empty if direct awarding
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(val) >= today;
  }, {
    message: "validation.deadlinePast",
  }).or(z.literal("")),
  jobStartDate: z.string().min(1, { message: "validation.startDateReq" }),
  preferredTimeSlot: z.enum(['Morning', 'Afternoon', 'Evening', 'Weekend', 'Any']).default('Any'),
  attachments: z.array(z.instanceof(File)).optional(),
  directAwardProfessionalId: z.string().optional(),
}).refine(data => {
  if (data.directAwardProfessionalId) {
    return !!data.priceEstimate && data.priceEstimate.min > 0;
  }
  return true;
}, {
  message: "validation.budgetReqDirect",
  path: ["priceEstimate.min"],
}).refine(data => {
  if (data.directAwardProfessionalId) return true;
  return data.deadline !== "";
}, {
  message: "validation.deadlineReqPublic",
  path: ["deadline"],
}).refine(data => {
  if (!data.deadline || !data.jobStartDate) return true;
  return new Date(data.jobStartDate) >= new Date(data.deadline);
}, {
  message: "validation.startDateBeforeDeadline",
  path: ["jobStartDate"],
}).refine(data => {
  const max = data.priceEstimate?.max;
  if (typeof max === "number" && max > 0) {
    return data.priceEstimate!.min <= max;
  }
  return true;
}, {
  message: "validation.maxBudgetLow",
  path: ["priceEstimate.max"],
}).and(z.object({
  verifyDetails: z.boolean().refine(val => val === true, {
    message: "validation.verifyReq",
  }),
}));


function DirectAwardInput({ control }: { control: Control<any> }) {
  const { db } = useFirebase();
  const tJob = useTranslations('job');
  const tError = useTranslations('errors');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<User | null>(null);

  const debouncedCheck = useMemo(
    () => debounce(async (id: string) => {
      if (!id) {
        setSelectedProfessional(null);
        setIsLoading(false);
        return;
      }

      // const result = await verifyProfessionalAction(id);
      const result = { success: false, professional: undefined }; // Disabled for 500 error debugging

      if (result.success && result.professional) {
        setSelectedProfessional(result.professional as User);
      } else {
        setSelectedProfessional(null);
      }
      setIsLoading(false);
    }, 500),
    []
  );

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsLoading(true);
    debouncedCheck(value);
  };

  const professionalId = useWatch({ control, name: "directAwardProfessionalId" });

  useEffect(() => {
    if (professionalId) {
      setIsLoading(true);
      debouncedCheck(professionalId);
    }
  }, [professionalId, debouncedCheck]);

  return (
    <FormField
      control={control}
      name="directAwardProfessionalId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{tJob('professionalId')}</FormLabel>
          <FormControl>
            <Input
              placeholder={tJob('professionalIdPlaceholder')}
              {...field}
              onChange={(e) => {
                field.onChange(e);
                handleIdChange(e);
              }}
            />
          </FormControl>
          <FormDescription>
            {tJob('professionalIdDesc')}
          </FormDescription>
          {isLoading && <p className="text-sm text-muted-foreground">{tJob('verifyingId')}</p>}
          {selectedProfessional && !isLoading && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedProfessional.realAvatarUrl} alt={selectedProfessional.name} />
                <AvatarFallback>{selectedProfessional.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{selectedProfessional.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-600" /> {tJob('verifiedProfessional')}</p>
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
  const { storage } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapCenter, setMapCenter] = React.useState<{ lat: number, lng: number } | null>(null);
  const { setHelp } = useHelp();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const tJob = useTranslations('job');
  const tCommon = useTranslations('common');
  const tSuccess = useTranslations('success');
  const tError = useTranslations('errors');

  // Feature Flags
  const isAiEnabled = useFeatureFlag('ENABLE_AI_GENERATION');

  // Draft & Template state
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<JobDraft | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showSmartEstimator, setShowSmartEstimator] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPostConfirmDialogOpen, setIsPostConfirmDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof jobSchema> | null>(null);

  const tValidation = useTranslations('validation');

  // Custom resolver to translate Zod errors
  const translatedResolver = useCallback(async (data: any, context: any, options: any) => {
    const resolver = zodResolver(jobSchema);
    const result = await resolver(data, context, options);

    if (Object.keys(result.errors).length > 0) {
      const translateErrorNode = (node: any): any => {
        if (!node || typeof node !== 'object') return node;

        if (node.message && typeof node.message === 'string') {
          const messageKey = node.message;
          if (messageKey.startsWith('validation.') || messageKey.startsWith('address.')) {
            const [ns, k] = messageKey.split('.');
            return { ...node, message: ns === 'address' ? tJob(k) : tValidation(k) };
          }
          return node;
        }

        const newNode: any = Array.isArray(node) ? [] : {};
        for (const key in node) {
          newNode[key] = translateErrorNode(node[key]);
        }
        return newNode;
      };

      return { ...result, errors: translateErrorNode(result.errors) };
    }
    return result;
  }, [tJob, tValidation]);


  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: translatedResolver as any, // Cast to any to avoid complex typing issues with custom resolver wrapper
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
      deadline: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      jobStartDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"),
      attachments: [],
      directAwardProfessionalId: "",
      priceEstimate: { min: 0, max: 0 },
      verifyDetails: false, 
    },
  });

  const watchedMin = useWatch({ control: form.control, name: "priceEstimate.min" }) || 0;
  const watchedMax = useWatch({ control: form.control, name: "priceEstimate.max" }) || 0;

  const repostJobId = searchParams.get('repostJobId');
  const editJobId = searchParams.get('editJobId');
  const directAwardParam = searchParams.get('directAwardProfessionalId');
  const wizardCompletedParam = searchParams.get('wizardCompleted');
  const isWizardCompleted = wizardCompletedParam === 'true';
  const isEditMode = !!editJobId;

  const normalizeDraftBudget = (pe?: { min: number; max?: number }) => {
    if (!pe) return undefined;
    const min = pe.min || 0;
    const max = typeof pe.max === "number" && pe.max > 0 ? pe.max : min;
    return { min, max };
  };

  // Auto-save hook
  const getDraftData = () => ({
    title: form.getValues('jobTitle'),
    description: form.getValues('jobDescription'),
    jobCategory: form.getValues('jobCategory'),
    skills: form.getValues('skills')?.split(',').map(s => s.trim()),
    budget: normalizeDraftBudget(form.getValues('priceEstimate')),
    location: form.getValues('address.cityPincode'),
    address: form.getValues('address'),
    fullAddress: form.getValues('address.fullAddress'),

    jobStartDate: form.getValues('jobStartDate') ? new Date(form.getValues('jobStartDate')) : undefined,
    travelTip: form.getValues('travelTip'),
    directAwardProfessionalId: form.getValues('directAwardProfessionalId'),
    isGstInvoiceRequired: form.getValues('isGstInvoiceRequired'),
    attachments: form.getValues('attachments')?.map(f => ({ fileName: f.name, fileType: f.type })) as any,
  });

  const { saveStatus, draftId, saveNow, setDraftId } = useAutoSave(
    getDraftData,
    {
      enabled: !isEditMode && !isSubmitted && !repostJobId && process.env.NEXT_PUBLIC_IS_CI !== 'true',
      onSave: (id) => setDraftId(id),
    }
  );

  const handleAutoResume = useCallback((draft: JobDraft) => {
    form.reset({
      jobTitle: draft.title || '',
      jobDescription: draft.description || '',
      jobCategory: draft.jobCategory || '',
      skills: draft.skills?.join(', ') || '',
      travelTip: draft.travelTip || 0,
      isGstInvoiceRequired: draft.isGstInvoiceRequired || false,
      address: draft.address || form.getValues('address'),
      deadline: draft.deadline ? format(toDate(draft.deadline), "yyyy-MM-dd") : format(addDays(new Date(), 7), "yyyy-MM-dd"),
      jobStartDate: draft.jobStartDate ? format(toDate(draft.jobStartDate), "yyyy-MM-dd'T'HH:mm") : format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"),
      directAwardProfessionalId: draft.directAwardProfessionalId || '',
      priceEstimate: draft.budget || { min: 0, max: 0 },
    });

    setDraftId(draft.id);
    setShowDraftDialog(false);
    toast({
      title: tSuccess('draftLoaded'),
      description: tSuccess('draftLoadedDesc'),
    });
  }, [form, setDraftId, toast, tSuccess]);

  useEffect(() => {
    if (directAwardParam) {
      form.setValue('directAwardProfessionalId', directAwardParam, { shouldValidate: true });
    }
    const checkForDraft = async () => {
      if (!user || isEditMode || repostJobId || isSubmitted) return;
      try {
        const { getLatestDraftAction } = await import('@/app/actions/draft.actions');
        const res = await getLatestDraftAction(user.id);
        if (res.success && res.draft) {
          setLoadedDraft(res.draft);
          if (isWizardCompleted) {
            // Auto-resume if coming from wizard
            handleAutoResume(res.draft);
          } else {
            setShowDraftDialog(true);
          }
        } else if (isWizardCompleted) {
           // Coming from wizard but no draft found yet? 
           // At least we have the default future dates set now from useForm defaultValues.
           // We could optionally show a small toast or just let the user fill it.
           console.log("Wizard completed but no draft found in Firestore yet.");
        } else if (!directAwardParam && !isWizardCompleted && process.env.NEXT_PUBLIC_IS_CI !== 'true') {
          // Wizard-first guard: No draft, no special params → redirect to wizard
          router.replace('/wizard');
        }
      } catch (error) {
        // Ignore error silently
      }
    };

    checkForDraft();
  }, [directAwardParam, form, handleAutoResume, isEditMode, isSubmitted, isWizardCompleted, repostJobId, router, user]);

  const handleResumeDraft = useCallback(() => {
    if (!loadedDraft) return;
    handleAutoResume(loadedDraft);
  }, [loadedDraft, handleAutoResume]);

  const handleDiscardDraft = useCallback(async () => {
    if (!loadedDraft || !user) return;

    await deleteDraftAction(user.id, loadedDraft.id);
    setShowDraftDialog(false);
    toast({
      title: tSuccess('draftDiscarded'),
      description: tSuccess('draftDiscardedDesc'),
    });
    // Redirect to wizard if this was a fresh start (no wizardCompleted param)
    if (!isWizardCompleted) {
        router.replace('/wizard');
    }
  }, [isWizardCompleted, loadedDraft, router, tSuccess, toast, user]);

  // Handle template selection
  const handleTemplateSelect = useCallback(async (template: JobTemplate) => {
    if (!user) return;

    const fields = template.fields;
    form.reset({
      jobTitle: fields.title || '',
      jobDescription: fields.description || '',
      jobCategory: template.category,
      skills: fields.skills?.join(', ') || '',
      travelTip: fields.travelTip || 0,
      isGstInvoiceRequired: fields.isGstInvoiceRequired || false,
      address: fields.address || form.getValues('address'),
      deadline: fields.deadline ? format(toDate(fields.deadline), "yyyy-MM-dd") : format(addDays(new Date(), 7), "yyyy-MM-dd"),
      jobStartDate: fields.jobStartDate ? format(toDate(fields.jobStartDate), "yyyy-MM-dd'T'HH:mm") : format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"),
      directAwardProfessionalId: '',
      priceEstimate: fields.budget || { min: 0, max: 0 },
    });

    await incrementTemplateUsageAction(user.id, template.id);

    toast({
      title: tSuccess('templateLoaded'),
      description: tSuccess('templateLoadedDesc', { name: template.name }),
    });
  }, [user, form, toast, tSuccess]);

  React.useEffect(() => {
    async function prefillForm() {
      const jobId = editJobId || repostJobId;
      if (jobId && user) {
        setIsProcessing(true);

        const result = await getJobForEditAction(jobId, user.id);

        if (result.success && result.job) {
          const jobData = result.job;

          if (isEditMode && jobData.status !== 'Open for Bidding' && jobData.status !== 'open') { // Handle both cases
            toast({
              title: tError('modificationRestricted'),
              description: tError('modificationRestrictedDesc'),
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
            directAwardProfessionalId: "", // Never prefill direct award
            priceEstimate: jobData.priceEstimate
          });

          const toastTitle = isEditMode ? tJob('editJob') : tJob('repostJob');
          const toastDescription = isEditMode
            ? tJob('editJobDesc')
            : tJob('repostJobDesc');

          toast({ title: toastTitle, description: toastDescription });
        } else {
          toast({ title: tCommon('error'), description: tError('loadJobFailed'), variant: "destructive" });
        }
        setIsProcessing(false);
      }
    }
    prefillForm();
  }, [editJobId, repostJobId, user, form, toast, isEditMode, router, tCommon, tError, tJob]);

  React.useEffect(() => {
    setHelp({
      title: isEditMode ? tJob('editHelpTitle') : tJob('helpTitle'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{tJob('helpIntro')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{tJob('helpBudget')}:</span> {tJob('helpBudgetDesc', { aiText: isAiEnabled ? tJob('helpAiSuggest') : '' })}</li>
            <li><span className="font-semibold">{tJob('helpCategory')}:</span> {tJob('helpCategoryDesc')}</li>
            {isAiEnabled && <li><span className="font-semibold">{tJob('helpAiFields')}:</span> {tJob('helpAiFieldsDesc')}</li>}
            <li><span className="font-semibold">{tJob('helpLocation')}:</span> {tJob('helpLocationDesc')}</li>
            <li><span className="font-semibold">{tJob('helpAttachments')}:</span> {tJob('helpAttachmentsDesc')}</li>
            {!isEditMode && <li><span className="font-semibold">{tJob('helpDirectAward')}:</span> {tJob('helpDirectAwardDesc')}</li>}
          </ul>
        </div>
      )
    })
  }, [setHelp, isEditMode, isAiEnabled, tJob]);

  useEffect(() => {
    if (!userLoading && role !== 'Client') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  const jobTitle = useWatch({ control: form.control, name: "jobTitle" });
  const jobCategory = useWatch({ control: form.control, name: "jobCategory" });
  const jobDescription = useWatch({ control: form.control, name: "jobDescription" });
  const directAwardProfessionalId = useWatch({ control: form.control, name: "directAwardProfessionalId" });
  const jobTitleState = form.getFieldState("jobTitle");
  const isJobTitleValid = jobTitle && !jobTitleState.invalid;

  // Validation for price estimate
  const canEstimatePrice = jobTitle && jobDescription && jobCategory && jobDescription.length >= 50;

  const handleGenerateDetails = async (overrideTitle?: string) => {
    const titleToUse = overrideTitle || jobTitle;

    if (!titleToUse || titleToUse.length < 10) {
      toast({
        title: tError('invalidTitle'),
        description: tError('invalidTitleDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateJobDescriptionAction({ jobTitle: titleToUse });
      if (result.success && result.data) {
        form.setValue("jobDescription", result.data.jobDescription, { shouldValidate: true });
        form.setValue("skills", result.data.suggestedSkills.join(', '), { shouldValidate: true });

        toast({
          title: tSuccess('aiSuggestionsAdded'),
          description: tSuccess('aiSuggestionsAddedDesc'),
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: tError('generationFailed'),
        description: tError((error as any).message) || tError('generationFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    // OLD LOGIC: form.setValue("jobTitle", transcript, { shouldValidate: true });
    // NEW LOGIC: Call Smart Voice Processor

    setIsGenerating(true);
    try {
      const { generateSmartJobFromVoiceAction } = await import('@/app/actions/ai.actions');
      const result = await generateSmartJobFromVoiceAction(transcript);

      if (result.success && result.data) {
        const data = result.data;
        // Populate Form - HUMAN IN THE LOOP
        form.setValue("jobTitle", data.title, { shouldValidate: true });
        form.setValue("jobDescription", data.description, { shouldValidate: true });
        // Use suggested category if available, else default
        form.setValue("jobCategory", data.category || "Security & Surveillance", { shouldValidate: true });
        form.setValue("skills", data.skills.join(', '), { shouldValidate: true });

        toast({
          title: "Voice Analysis Complete",
          description: "Job details have been auto-filled from your voice input.",
        });
      } else {
        // Fallback to simple title fill if AI fails
        form.setValue("jobTitle", transcript, { shouldValidate: true });
        handleGenerateDetails(transcript); // Trigger old generation logic as backup
      }
    } catch (error) {
      form.setValue("jobTitle", transcript, { shouldValidate: true });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Smart Visual Job Posting ---
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: tError('fileTooLarge'), description: tError('fileTooLargeDesc'), variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
        const base64Content = base64String.split(',')[1];

        // Call Server Action
        const { generateSmartJobFromImageAction } = await import('@/app/actions/ai.actions');
        const result = await generateSmartJobFromImageAction(base64Content);

        if (result.success && result.data) {
          const data = result.data;

          // Populate Form - HUMAN IN THE LOOP: User edits these values
          form.setValue("jobTitle", data.title, { shouldValidate: true });
          form.setValue("jobDescription", data.description, { shouldValidate: true });
          form.setValue("jobCategory", data.category || "Security & Surveillance", { shouldValidate: true }); // Auto-select category
          form.setValue("skills", data.skills.join(', '), { shouldValidate: true });

          toast({
            title: "Analysis Complete",
            description: "Job details have been auto-filled. Please review and edit before posting.",
          });
        } else {
          throw new Error(result.error || "Failed to analyze image.");
        }
        setIsGenerating(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: tError('generationFailed'), description: "Could not analyze image.", variant: "destructive" });
      setIsGenerating(false);
    }
  };

  const handleEstimatePrice = async () => {
    if (!canEstimatePrice) {
      toast({
        title: tError('moreDetailsRequired'),
        description: tError('moreDetailsRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsEstimating(true);
    try {
      const result = await generatePriceEstimateAction({
        jobTitle,
        jobDescription,
        jobCategory
      });

      if (result.success && result.data) {
        const estimate = result.data.priceEstimate;
        form.setValue("priceEstimate.min", estimate.min, { shouldValidate: true });
        if (!directAwardProfessionalId) {
          form.setValue("priceEstimate.max", estimate.max, { shouldValidate: true });
        }

        toast({
          title: tSuccess('budgetEstimated'),
          description: tSuccess('budgetEstimatedDesc', { min: estimate.min, max: estimate.max }),
          variant: "default"
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: tError('estimationFailed'),
        description: tError((error as any).message) || tError('estimationFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setIsEstimating(false);
    }
  };


  // ... (render logic) ...


  async function onSubmit(values: z.infer<typeof jobSchema>) {
    setPendingValues(values);
    if (isEditMode) {
      setIsConfirmDialogOpen(true);
    } else {
      setIsPostConfirmDialogOpen(true);
    }
  }

  async function handleFinalSubmit() {
    const values = pendingValues;
    if (!values) return;


    // Close dialogs
    setIsConfirmDialogOpen(false);
    setIsPostConfirmDialogOpen(false);

    if (!user || !storage) { // Removed db requirement
      toast({ title: tCommon('error'), description: tError('loginRequired'), variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const [pincode] = values.address.cityPincode.split(',');

    // 1. Upload Attachments (Client-side)
    const attachmentUrls: JobAttachment[] = [];
    try {
      if (values.attachments && values.attachments.length > 0) {
        for (const file of values.attachments) {
          // Compress the image before uploading
          const finalFileToUpload = await compressImage(file);

          const fileRef = ref(storage, `jobs/${user.id}/${Date.now()}/${finalFileToUpload.name}`);
          await uploadBytes(fileRef, finalFileToUpload);
          const downloadURL = await getDownloadURL(fileRef);
          attachmentUrls.push({
            fileName: finalFileToUpload.name,
            fileUrl: downloadURL,
            fileType: finalFileToUpload.type,
          });
        }
      }
    } catch (uploadError) {
      toast({ title: tCommon('uploadFailed'), description: tCommon('uploadFailedDesc'), variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    // 2. Prepare Data for Server Action
    const jobInput: CreateJobInput = {
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
      deadline: values.deadline ? new Date(values.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isUrgent: false,
      attachments: attachmentUrls,
      priceEstimate: values.priceEstimate ? {
        min: values.priceEstimate.min,
        max: values.directAwardProfessionalId ? values.priceEstimate.min : (values.priceEstimate.max ?? values.priceEstimate.min),
      } : undefined,
      directAwardProfessionalId: values.directAwardProfessionalId || undefined,
      preferredTimeSlot: values.preferredTimeSlot,
    };

    try {
      let result;
      if (isEditMode && editJobId) {
        // Update Action
        result = await updateJobAction(editJobId, user.id, jobInput);

        if (result.success) {
          toast({ title: tSuccess('jobUpdated'), description: tSuccess('jobUpdatedDesc') });
          router.push(`/dashboard/jobs/${editJobId}`);
        } else {
          throw new Error(result.error);
        }

      } else {
        // Create Action
        result = await createJobAction(jobInput, user.id, role);

        if (result.success && result.jobId) {
          setIsSubmitted(true);

          // Clear Draft after success
          if (draftId && user) {
            deleteDraftAction(user.id, draftId).catch(() => {});
          }

          const targetUrl = `/dashboard/jobs/${result.jobId}`;

          toast({
            title: repostJobId ? tSuccess('jobReposted') : tSuccess('jobPosted'),
            description: tSuccess('jobLive'),
            action: (
              <ToastAction altText="View Job" onClick={() => router.push(targetUrl)}>
                View Job
              </ToastAction>
            ),
          });
          form.reset();

          // Try router push first
          router.push(targetUrl);

          // Fallback: If router doesn't navigate within 3s, force reload
          setTimeout(() => {
            if (window.location.pathname !== targetUrl) {
              window.location.href = targetUrl;
            }
          }, 3000);

        } else {
          throw new Error(result.error);
        }
      }


    } catch (error: any) {
      toast({
        title: tError('postFailed'),
        description: error.message || tCommon('error'),
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

  if (!userLoading && role !== 'Client') {
    return null;
  }

  const buttonText = isEditMode ? tJob('saveChanges') : (repostJobId ? tJob('repostJob') : tJob('postJob'));

  const handleSubmitClick = async () => {
    // Check form validity before submission
    // If valid, submit the form
    form.handleSubmit(onSubmit, (errors) => {
      // Invalid handler
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }

      toast({
        title: tCommon('checkForm'),
        description: tCommon('checkFormDesc'),
        variant: "destructive",
      });
    })();
  };

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4 px-4 max-w-full overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white bg-surface dark:bg-slate-950 text-on-surface pb-16">
      <div className="flex items-center gap-4 mt-8 mb-4">
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter break-words text-on-surface">
          {isEditMode ? tJob('editJob') : (repostJobId ? tJob('repostJob') : tJob('postJob'))}
        </h1>
        {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="grid gap-4">
          <Card className="border-0 shadow-lg shadow-black/5 bg-surface-container-low dark:bg-slate-900 rounded-xl overflow-hidden">
            <CardHeader className="bg-surface-container-highest dark:bg-slate-800/50 border-b border-outline-variant/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold font-headline">{tJob('jobDetails')}</CardTitle>
                  <CardDescription className="text-sm text-on-surface-variant font-medium mt-1">
                    {isEditMode
                      ? tJob('editJobDesc')
                      : (repostJobId
                        ? tJob('repostJobDesc')
                        : tJob('postJobDesc'))
                    }
                  </CardDescription>
                </div>
                {/* Save Status Indicator */}
                {!isEditMode && !repostJobId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {saveStatus === 'saving' && (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>{tCommon('saving')}</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">{tCommon('saved')}</span>
                      </>
                    )}
                    {saveStatus === 'idle' && draftId && (
                      <>
                        <Save className="h-4 w-4" />
                        <span>{tCommon('draftAutoSaved')}</span>
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
                    <FormLabel>{tJob('category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="job-category-select" className="h-12 md:h-10 text-base md:text-sm">
                          <SelectValue placeholder={tJob('categoryPlaceholder')} />
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
                      {tJob('categoryDesc')}
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
                    <FormLabel>{tJob('title')}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder={tJob('titlePlaceholder')}
                          {...field}
                          data-testid="job-title-input"
                          id="job-title-input-field"
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
                      <FormLabel>{tJob('description')}</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleGenerateDetails()}
                        disabled={isGenerating}
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {tCommon('generating')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                            {tJob('autoGenerateDetails')}
                          </>
                        )}
                      </Button>

                      <div className="hidden">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageAnalysis}
                          disabled={isGenerating}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                        className="w-full sm:w-auto mt-2 sm:mt-0 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                      >
                        {isGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        Analyze Site Photo
                      </Button>
                    </div>
                    <FormControl>
                      <div className="space-y-2">
                        <Textarea
                          placeholder={tJob('descriptionPlaceholder')}
                          className={cn("min-h-32 text-base md:text-sm", isGenerating && "opacity-50")}
                          {...field}
                          data-testid="job-description-input"
                        />
                        {/* AI Feedback Control - Only show if description exists (likely AI generated or at least user has input) */}
                        {field.value && field.value.length > 50 && (
                          <div className="flex justify-end">
                            <AIFeedbackControl
                              flowName="jobScopingWizardFlow"
                              metadata={{ jobTitle, category: jobCategory }}
                            />
                          </div>
                        )}
                      </div>
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
                      <FormLabel>{tJob('skills')}</FormLabel>
                      {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <FormControl>
                      <Input
                        placeholder={tJob('skillsPlaceholder')}
                        className={cn(isGenerating && "opacity-50", "h-12 md:h-10 text-base md:text-sm")}
                        {...field}
                        data-testid="skills-input"
                      />
                    </FormControl>
                    <FormDescription>
                      {tJob('skillsDesc')}
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
                        data-testid="gst-invoice-checkbox"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        {tJob('gstInvoice')}
                      </FormLabel>
                      <FormDescription>
                        {tJob('gstInvoiceDesc')}
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
                      <FormLabel>{tJob('attachments')}</FormLabel>
                      <FormControl>
                        <FileUpload
                          onFilesChange={(files) => field.onChange(files)}
                          maxFiles={5}
                        />
                      </FormControl>
                      <FormDescription>{tJob('attachmentsDesc')}</FormDescription>
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
                      <FormLabel>{tJob('deadline')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} disabled={!!directAwardProfessionalId} data-testid="job-deadline-input" />
                      </FormControl>
                      <FormDescription>{tJob('deadlineDesc')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tJob('startDate')}</FormLabel>
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
                      <FormLabel>{tJob('travelTip')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 500" {...field} />
                      </FormControl>
                      <FormDescription>
                        {tJob('travelTipDesc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredTimeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tJob('preferredTime') || "Preferred Time"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Any">Any Time</SelectItem>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                          <SelectItem value="Evening">Evening</SelectItem>
                          <SelectItem value="Weekend">Weekend</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Best time for Professional to visit
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
                  <CardTitle>{tJob('budget')}</CardTitle>
                  <CardDescription>
                    {directAwardProfessionalId ? tJob('budgetDirectDesc') : tJob('budgetDesc')}
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
                  {tJob('aiEstimate')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Template Selector */}
              {!directAwardProfessionalId && (
                <div className="flex justify-end">
                  <BudgetTemplateSelector
                    onSelect={(template) => {
                      form.setValue('priceEstimate.min', template.min, { shouldValidate: true });
                      form.setValue('priceEstimate.max', template.max, { shouldValidate: true });
                      toast({ title: tJob('budgetApplied'), description: tJob('budgetAppliedDesc', { name: template.name }) });
                    }}
                    currentValues={{
                      min: watchedMin,
                      max: watchedMax
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
                      <FormLabel>{directAwardProfessionalId ? tJob('offeredBudget') : tJob('minBudget')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 8000" {...field} data-testid="min-budget-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceEstimate.max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tJob('maxBudget')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 12000" {...field} data-testid="max-budget-input" />
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
                  {tJob('directRequest')}
                </CardTitle>
                <CardDescription>
                  {tJob('directRequestDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DirectAwardInput control={form.control} />
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border p-4 bg-muted/30">
            <FormField
              control={form.control}
              name="verifyDetails"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      data-testid="verify-details-checkbox"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {tJob('verifyDetails')}
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

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
                  {tJob('saveAsTemplate')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                {tCommon('cancel')}
              </Button>
              {isEditMode ? (
                <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" disabled={isProcessing || isGenerating}>
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {tJob('saveChanges')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tJob('saveChangesTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {tJob('saveChangesDesc')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => { e.preventDefault(); handleFinalSubmit(); }}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tJob('confirmAndSave')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog open={isPostConfirmDialogOpen} onOpenChange={setIsPostConfirmDialogOpen}>
                  <Button
                    type="button"
                    disabled={isProcessing || isGenerating}
                    onClick={handleSubmitClick}
                    data-testid="post-job-button"
                  >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {repostJobId ? tJob('repostJob') : tJob('postJob')}
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tJob('confirmPostTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {tJob('confirmPostDesc')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => { e.preventDefault(); handleFinalSubmit(); }}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tJob('confirmAndSave')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
          budget: normalizeDraftBudget(form.getValues('priceEstimate')),
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
          if (!directAwardProfessionalId) {
            form.setValue('priceEstimate.max', max, { shouldValidate: true });
          }
        }}
      />
    </div >
  );
}

