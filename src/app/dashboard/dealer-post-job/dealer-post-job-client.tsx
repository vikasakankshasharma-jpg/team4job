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
import { Job, JobAttachment, User, PlatformSettings, Address } from "@/lib/types";
import { AddressForm } from "@/components/ui/address-form";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
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
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  endCustomerName: z.string().min(2, { message: "End Customer Name is required for B2B jobs" }),
  endCustomerPhone: z.string().min(10, { message: "Valid Phone Number is required" }),
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
  verifyDetails: z.boolean().default(false),
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
});

function DirectAwardInput({ control }: { control: Control<any> }) {
  const { db } = useFirebase();
  const tJob = useTranslations('job');
  const tError = useTranslations('errors');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<User | null>(null);

  const professionalId = useWatch({ control, name: "directAwardProfessionalId" });

  const debouncedCheck = useMemo(
    () => debounce(async (id: string) => {
      if (!id || !db) {
        setSelectedProfessional(null);
        setIsLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
          setSelectedProfessional(data);
        } else {
          setSelectedProfessional(null);
        }
      } catch {
        setSelectedProfessional(null);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [db]
  );

  useEffect(() => {
    if (professionalId) {
      queueMicrotask(() => {
        setIsLoading(true);
      });
      debouncedCheck(professionalId);
    } else {
      setSelectedProfessional(null);
      setIsLoading(false);
    }
  }, [professionalId, debouncedCheck]);

  return (
    <FormField
      control={control}
      name="directAwardProfessionalId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{tJob('directAwardLabel')}</FormLabel>
          <FormControl>
            <Input
              placeholder={tJob('directAwardPlaceholder')}
              {...field}
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

const CATEGORIZED_TEMPLATES: Record<string, any[]> = {
  "Security & Surveillance": [
    {
      id: "cctv-new",
      title: "New CCTV Camera Installation",
      category: "Security & Surveillance",
      skills: "CCTV Installation, Wiring, DVR Setup",
      desc: "Need to install [X] new CCTV cameras at my location. I already have the cameras and DVR, but need professional installation, wiring, and configuration to my mobile phone.",
      min: 1500, max: 3000
    },
    {
      id: "cctv-relocate",
      title: "Relocate Existing CCTV Cameras",
      category: "Security & Surveillance",
      skills: "CCTV Maintenance, Wiring",
      desc: "Need to safely unmount and relocate [X] existing CCTV cameras to new positions. Wiring will need to be re-routed. DVR remains in the same place.",
      min: 1000, max: 2000
    },
    {
      id: "cctv-repair",
      title: "CCTV/DVR Not Recording",
      category: "Security & Surveillance",
      skills: "Troubleshooting, DVR Maintenance",
      desc: "My CCTV system has stopped recording. The cameras are on but the DVR shows a hard drive error or no signal. Need an expert to diagnose and fix.",
      min: 500, max: 1500
    }
  ],
  "Electrical & Power": [
    {
      id: "ac-install",
      title: "Install New Split AC",
      category: "Electrical & Power",
      skills: "AC Installation, Drilling, Wiring",
      desc: "Need a professional to install a new Split AC. I have the unit and the stand, but need copper piping installed and the outdoor unit mounted. Please bring a ladder and drill.",
      min: 1500, max: 2500
    },
    {
      id: "ac-relocate",
      title: "Relocate Split AC",
      category: "Electrical & Power",
      skills: "AC Dismantling, Gas Refill",
      desc: "Need to safely dismantle a Split AC from one room and install it in another room. Gas checking and top-up might be required.",
      min: 2000, max: 3500
    },
    {
      id: "wiring-fault",
      title: "New Electrical Wiring Setup",
      category: "Electrical & Power",
      skills: "Wiring, Concealed Wiring, MCB",
      desc: "Need new concealed wiring done for a room renovation. Includes setting up 4 new switchboards, fan point, and AC point with a dedicated MCB connection.",
      min: 3000, max: 8000
    }
  ],
  "Plumbing & Water Services": [
    {
      id: "plumbing-tap",
      title: "Fix Non-Working / Leaking Taps",
      category: "Plumbing & Water Services",
      skills: "Tap Repair, Spindle Replacement",
      desc: "I have [1 or multiple] taps that are leaking continuously or not dispensing water properly. Need the spindles checked or replaced.",
      min: 300, max: 800
    },
    {
      id: "plumbing-sink",
      title: "Unchoke Kitchen Sink",
      category: "Plumbing & Water Services",
      skills: "Drain Cleaning, Pipe Clearing",
      desc: "The kitchen sink is completely choked and water is not draining. Tried basic cleaning but it needs professional tools to clear the deep blockage.",
      min: 400, max: 1000
    },
    {
      id: "plumbing-geyser",
      title: "Install Water Heater (Geyser)",
      category: "Plumbing & Water Services",
      skills: "Geyser Installation, Wall mounting",
      desc: "Need a new 15L/25L geyser mounted on the bathroom wall and connected to the existing inlet/outlet water pipes.",
      min: 500, max: 1200
    }
  ]
};

export default function PostJobClient({ isMapLoaded }: { isMapLoaded: boolean }) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isEstimating, setIsEstimating] = React.useState(false); // New state for price estimation
  const { user, role, loading: userLoading } = useUser();
  const { storage, db } = useFirebase();
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
      endCustomerName: "",
      endCustomerPhone: "",
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
  const getDraftData = (): Partial<JobDraft> => ({
    title: form.getValues('jobTitle'),
    description: form.getValues('jobDescription'),
    jobCategory: form.getValues('jobCategory'),
    skills: form.getValues('skills')?.split(',').map(s => s.trim()),
    budget: normalizeDraftBudget(form.getValues('priceEstimate')),
    location: form.getValues('address.cityPincode'),
    address: form.getValues('address') as any,
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
      enabled: !isEditMode && !isSubmitted && !repostJobId && process.env.NEXT_PUBLIC_E2E !== 'true',
      onSave: (id) => setDraftId(id),
    }
  );

  const handleAutoResume = useCallback((draft: JobDraft) => {
    // 🛡️ E2E/User-Protection: Don't overwrite if user has already started filling significant data
    const currentTitle = form.getValues('jobTitle');
    const currentDesc = form.getValues('jobDescription');
    if (currentTitle && currentTitle !== draft.title && currentTitle.length > 5) {
      return;
    }

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
    const checkForDraft = async (retries = 10) => {
      if (!user || isEditMode || repostJobId || isSubmitted) return;
      
      try {
        const res = await getLatestDraftAction(user.id);

        let foundDraft = null;
        if (res.success && res.draft) {
          foundDraft = res.draft;
        } else if (isWizardCompleted && db) {
          // Fallback: Check local client cache to bypass emulator sync delay
          const { getLatestDraft } = await import('@/lib/api/drafts');
          const clientDraft = await getLatestDraft(db, user.id);
          if (clientDraft) {
            foundDraft = clientDraft;
          }
        }

        if (foundDraft) {
          setLoadedDraft(foundDraft);
          if (isWizardCompleted) {
            handleAutoResume(foundDraft);
          } else {
            setShowDraftDialog(true);
          }
        } else if (isWizardCompleted && retries > 0) {
          setTimeout(() => checkForDraft(retries - 1), 2500);
        } else if (isWizardCompleted) {
           console.warn("[PostJob] Wizard completed but no draft found in Firestore after extended retries.");
        } else if (!directAwardParam && !isWizardCompleted && process.env.NEXT_PUBLIC_E2E !== 'true' && !userLoading && user?.roles?.includes('Client')) {
          router.replace('/wizard');
        }
      } catch (error: any) {
        if (error?.message?.includes('ABORTED') || error?.message?.includes('fetch')) {
          console.warn(`[PostJob] Draft fetch interrupted: ${error.message}. Retrying...`);
        }
        if (isWizardCompleted && retries > 0) {
           setTimeout(() => checkForDraft(retries - 1), 2500);
        }
      }
    };

    if (user && !userLoading) {
      checkForDraft();
    }
  }, [directAwardParam, form, handleAutoResume, isEditMode, isSubmitted, isWizardCompleted, repostJobId, router, user, db, userLoading]);

  const isE2EReady = !userLoading && (!isWizardCompleted || !!loadedDraft || process.env.NEXT_PUBLIC_E2E !== 'true');

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

    if (!user || !storage) { // Removed db requirement
      toast({ title: tCommon('error'), description: tError('loginRequired'), variant: "destructive" });
      setIsConfirmDialogOpen(false);
      setIsPostConfirmDialogOpen(false);
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
      // Dealer MVP (B2B workflow fields)
      requesterType: 'DEALER',
      endCustomerContact: {
        name: values.endCustomerName,
        phone: values.endCustomerPhone,
        address: values.address,
      },
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
        title: tCommon('error'),
        description: error.message || tCommon('error'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsConfirmDialogOpen(false);
      setIsPostConfirmDialogOpen(false);
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
    <div className="mx-auto grid max-w-6xl flex-1 auto-rows-max gap-12 px-6 max-w-full overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white bg-surface dark:bg-slate-950 text-on-surface pb-32">
      <header className="mt-16 mb-8 space-y-4">
        <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
           MISSION ORIGINATION // SERIES 4.0
        </Badge>
        <div className="flex items-center gap-6">
          <h1 className="text-6xl sm:text-8xl md:text-[9.5rem] font-black font-headline tracking-tighter break-words text-on-surface uppercase italic leading-[0.85] bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent">
            {isEditMode ? tJob('editJob') : (repostJobId ? tJob('repostJob') : tJob('postJob'))}
          </h1>
          {isProcessing && <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />}
        </div>
        <p className="text-lg font-medium italic opacity-40 tracking-tight underline underline-offset-8 decoration-primary/20">Architect your requirement for global deployment.</p>        </header>

                {/* Quick Job Templates */}
        {!isEditMode && !repostJobId && (
          <div className="mb-8 space-y-4 bg-surface-container-low/20 p-6 rounded-[2.5rem] border border-white/5">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Templates
            </h3>
            
            <Tabs defaultValue="CCTV" className="w-full">
              <TabsList className="bg-background/50 border border-white/10 rounded-2xl p-1 mb-4">
                {Object.keys(CATEGORIZED_TEMPLATES).map(category => (
                  <TabsTrigger key={category} value={category} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Object.entries(CATEGORIZED_TEMPLATES).map(([category, templates]) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          form.setValue("jobTitle", template.title, { shouldValidate: true });
                          form.setValue("jobCategory", template.category, { shouldValidate: true });
                          form.setValue("skills", template.skills, { shouldValidate: true });
                          form.setValue("jobDescription", template.desc, { shouldValidate: true });
                          form.setValue("priceEstimate.min", template.min, { shouldValidate: true });
                          form.setValue("priceEstimate.max", template.max, { shouldValidate: true });
                          toast({
                            title: "Template Applied!",
                            description: `Filled form for: ${template.title}`
                          });
                          // Scroll to description
                          document.getElementById('jobDescription')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="min-w-[280px] max-w-[300px] p-5 text-left border border-white/10 bg-background/50 backdrop-blur-md rounded-[2rem] hover:ring-2 hover:ring-primary/50 hover:bg-primary/5 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex-shrink-0 group"
                      >
                        <h4 className="font-bold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-1">{template.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{template.desc}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] uppercase font-black bg-background border-none">{template.category}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="grid gap-4">
          <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/5">
            <CardHeader className="p-12 bg-background/5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-4xl font-black italic tracking-tighter uppercase leading-none">{tJob('jobDetails')}</CardTitle>
                  <CardDescription className="text-sm text-on-surface-variant font-medium italic opacity-60">
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
            <CardContent className="p-12 space-y-12">
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
                    <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('category')}</FormLabel>
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
                    </FormDescription>                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quick Job Templates Contextual Rendering */}
                {!isEditMode && !repostJobId && jobCategory && CATEGORIZED_TEMPLATES[jobCategory] && (
                  <div className="space-y-4 bg-surface-container-low/20 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Quick Templates for {jobCategory}
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {CATEGORIZED_TEMPLATES[jobCategory].map(template => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            form.setValue("jobTitle", template.title, { shouldValidate: true });
                            form.setValue("skills", template.skills, { shouldValidate: true });
                            form.setValue("jobDescription", template.desc, { shouldValidate: true });
                            form.setValue("priceEstimate.min", template.min, { shouldValidate: true });
                            form.setValue("priceEstimate.max", template.max, { shouldValidate: true });
                            toast({
                              title: "Template Applied!",
                              description: `Filled form for: ${template.title}`
                            });
                            // Scroll to description
                            document.getElementById('jobDescription')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="min-w-[280px] max-w-[300px] p-5 text-left border border-white/10 bg-background/50 backdrop-blur-md rounded-[2rem] hover:ring-2 hover:ring-primary/50 hover:bg-primary/5 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex-shrink-0 group"
                        >
                          <h4 className="font-bold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-1">{template.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{template.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endCustomerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">End Customer Name (B2B)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            {...field}
                            className="h-12 md:h-10 text-base md:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endCustomerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">End Customer Phone (B2B)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+91..."
                            {...field}
                            className="h-12 md:h-10 text-base md:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('title')}</FormLabel>
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
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('description')}</FormLabel>
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
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('skills')}</FormLabel>
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
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('deadline')}</FormLabel>
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
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('startDate')}</FormLabel>
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
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('travelTip')}</FormLabel>
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
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('preferredTime') || "Preferred Time"}</FormLabel>
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
          <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/5">
            <CardHeader className="p-12 bg-background/5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-4xl font-black italic tracking-tighter uppercase leading-none">{tJob('budget')}</CardTitle>
                  <CardDescription className="text-sm text-on-surface-variant font-medium italic opacity-60">
                    {directAwardProfessionalId ? tJob('budgetDirectDesc') : tJob('budgetDesc')}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSmartEstimator(true)}
                  disabled={!canEstimatePrice}
                  className="gap-2 text-amber-600 border-amber-200/40 bg-amber-500/5 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-full px-6 py-2 font-black text-[10px] uppercase tracking-widest italic"
                >
                  <Sparkles className="h-4 w-4" />
                  {tJob('aiEstimate')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-12 space-y-12">
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
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{directAwardProfessionalId ? tJob('offeredBudget') : tJob('minBudget')}</FormLabel>
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
                      <FormLabel className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.5em] italic">{tJob('maxBudget')}</FormLabel>
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
            <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/5">
              <CardHeader className="p-12 bg-background/5 border-b border-white/5">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-4 text-4xl font-black italic tracking-tighter uppercase leading-none">
                    <UserPlus className="h-8 w-8 text-primary" />
                    {tJob('directRequest')}
                  </CardTitle>
                  <CardDescription className="text-sm text-on-surface-variant font-medium italic opacity-60">
                    {tJob('directRequestDesc')}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-12 space-y-4">
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
                      checked={Boolean(field.value)}
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
                      <AlertDialogCancel disabled={isProcessing}>{tCommon('cancel')}</AlertDialogCancel>
                      <Button onClick={(e) => { e.preventDefault(); handleFinalSubmit(); }} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tJob('confirmAndSave')}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog open={isPostConfirmDialogOpen} onOpenChange={setIsPostConfirmDialogOpen}>
                  <Button
                    type="button"
                    disabled={isProcessing || isGenerating || (process.env.NEXT_PUBLIC_E2E === 'true' && !isE2EReady)}
                    onClick={handleSubmitClick}
                    data-testid="post-job-button"
                    data-e2e-ready={isE2EReady}
                    id="post-job-submit-button"
                    className="h-20 px-16 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.5em] rounded-[1.8rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all italic"
                  >
                    {process.env.NEXT_PUBLIC_E2E === 'true' && isE2EReady && (
                        <div id="e2e-post-job-ready" className="hidden" />
                    )}
                    {isProcessing && <Loader2 className="mr-3 h-6 w-6 animate-spin" />}
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
                      <AlertDialogCancel disabled={isProcessing}>{tCommon('cancel')}</AlertDialogCancel>
                      <Button onClick={(e) => { e.preventDefault(); handleFinalSubmit(); }} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tJob('confirmAndSave')}
                      </Button>
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










