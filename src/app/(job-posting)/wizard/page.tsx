"use client";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { saveDraft } from "@/lib/api/drafts";
import { useToast } from "@/hooks/use-toast";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FixedQuestionStep } from "@/components/post-job/wizard/fixed-question-step";
import { LoadingCompiler } from "@/components/post-job/wizard/loading-compiler";
import { JobReviewStep } from "@/components/post-job/wizard/job-review-step";
import { TemplateSelectionStep } from "@/components/post-job/wizard/template-selection-step";
import { CategorySelectionStep } from "@/components/post-job/wizard/category-selection-step";
import { VoiceStep } from "@/components/post-job/wizard/voice-step";
import { ImageStep } from "@/components/post-job/wizard/image-step";
import { BulkUploadZone } from "@/components/post-job/bulk/bulk-upload-zone";
import { BulkReviewGrid } from "@/components/post-job/bulk/bulk-review-grid";
import { SmartSplitZone } from "@/components/post-job/bulk/smart-split-zone";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { aiTemplateService, JobTemplate } from "@/domains/ai/template.service";
import { 
    getTemplatesAction, 
    analyzeUserPatternsAction, 
    savePersonalTemplateAction,
    generateSmartJobFromVoiceAction,
    generateSmartJobFromImageAction
} from "@/app/actions/ai.actions";
import { Sparkles, Save, X, ArrowLeft, Mic, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CompileOutput = {
    jobTitle: string;
    jobDescription: string;
    conflictWarning?: string;
    priceEstimate?: {
        min: number;
        max: number;
        currency: string;
    };
    skills?: string[];
};

export default function SmartWizardPage() {
    const router = useRouter();
    const { user } = useUser();
    const { db } = useFirebase();
    const { toast } = useToast();

    // --- State ---
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [flowState, setFlowState] = useState<'category' | 'landing' | 'questions' | 'bulk' | 'split' | 'voice' | 'image' | 'compiling' | 'review'>('category');
    
    const [templates, setTemplates] = useState<JobTemplate[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    const [compiledJob, setCompiledJob] = useState<CompileOutput | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [patternSuggestion, setPatternSuggestion] = useState<any>(null);

    const [bulkJobs, setBulkJobs] = useState<any[]>([]);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const [wizardDraftId, setWizardDraftId] = useState<string | null>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // --- Auto-save wizard progress ---
    const autoSaveWizardProgress = useCallback(async () => {
        if (!user || !db || !selectedCategory) return;
        // Only auto-save if user has answered at least one question
        if (Object.keys(answers).length === 0) return;

        try {
            const id = await saveDraft(db, user.id, {
                title: `[Draft] ${selectedCategory}`,
                description: `Wizard in progress — ${Object.keys(answers).length} questions answered`,
                jobCategory: selectedCategory,
            }, wizardDraftId || undefined);
            setWizardDraftId(id);
        } catch {
            // Silent fail — don't disrupt the wizard
        }
    }, [user, db, selectedCategory, answers, wizardDraftId]);

    useEffect(() => {
        if (flowState !== 'questions' || Object.keys(answers).length === 0) return;

        // Debounce: save 3 seconds after the last answer change
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            autoSaveWizardProgress();
        }, 3000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [answers, flowState, autoSaveWizardProgress]);

    // --- Initial Load ---
    useEffect(() => {
        if (!selectedCategory || !user) return;

        async function loadCategoryConfig() {
            setIsLoadingData(true);
            try {
                // 1. Load Templates
                const tRes = await getTemplatesAction(selectedCategory!);
                if (tRes.success && tRes.data) setTemplates(tRes.data);

                // 2. Load Questions Config (Category data)
                const catConfig = aiTemplateService.getCategoryConfig(selectedCategory!);
                if (catConfig) {
                    // Set base questions initially
                    setQuestions(catConfig.questions || []);
                }

                // 3. Proactive Pattern Analysis
                const pRes = await analyzeUserPatternsAction();
                if (pRes.success && pRes.data?.suggestion?.patternFound) {
                    setPatternSuggestion(pRes.data.suggestion);
                }
            } catch (err) {
                toast({ title: "Error", description: "Failed to load category data.", variant: "destructive" });
            } finally {
                setIsLoadingData(false);
            }
        }
        loadCategoryConfig();
    }, [selectedCategory, user, toast]);

    // --- Handlers ---

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setFlowState('landing');
    };

    const handleTemplateSelect = (templateId: string | null) => {
        if (!templateId) {
            setFlowState('questions');
            return;
        }

        const template = templates.find(t => t.id === templateId);
        if (template) {
            setAnswers(template.defaultAnswers);
            
            // If template has a sub_type, pre-load those branch questions
            if (template.defaultAnswers.sub_type) {
                const catConfig = aiTemplateService.getCategoryConfig(selectedCategory!);
                if (catConfig && catConfig.branches) {
                    const subTypeKey = template.defaultAnswers.sub_type as keyof typeof catConfig.branches;
                    if (catConfig.branches[subTypeKey]) {
                        const baseQuestions = [...catConfig.questions];
                        const branchQuestions = catConfig.branches[subTypeKey];
                        const closing = catConfig.closingQuestions || [];
                        setQuestions([...baseQuestions, ...branchQuestions, ...closing]);
                    }
                }
            }
        }
        setFlowState('questions');
    };

    const handleAnswer = (value: string) => {
        const currentQuestion = questions[currentQuestionIndex];
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        // If this was the router question (sub_type), inject the branch questions
        if (currentQuestion.id === 'sub_type') {
            const catConfig = aiTemplateService.getCategoryConfig(selectedCategory!);
            if (catConfig && catConfig.branches) {
                const subTypeKey = value as keyof typeof catConfig.branches;
                if (catConfig.branches[subTypeKey]) {
                    const baseQuestions = [...catConfig.questions];
                    const branchQuestions = catConfig.branches[subTypeKey];
                    const closing = catConfig.closingQuestions || [];
                    setQuestions([...baseQuestions, ...branchQuestions, ...closing]);
                }
            }
        }
    };

    const handleNext = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        } else {
            setFlowState('compiling');
            await runInitialCompilation();
        }
    };

    const handleBack = () => {
        if (flowState === 'questions' && currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        } else if (flowState === 'questions' || flowState === 'voice' || flowState === 'image') {
            setFlowState('landing');
        } else if (flowState === 'landing') {
            setFlowState('category');
        } else if (flowState === 'review') {
            setFlowState('questions');
        } else {
            router.back();
        }
    };

    const handleVoiceAnalysis = async (transcript: string) => {
        setFlowState('compiling');
        try {
            const res = await generateSmartJobFromVoiceAction(transcript, selectedCategory!);
            if (res.success && res.data) {
                setCompiledJob(res.data);
                setFlowState('review');
            } else {
                throw new Error(res.error || "Voice analysis failed");
            }
        } catch (error) {
            toast({ title: "Voice Analysis Failed", description: "Could not process your recording.", variant: "destructive" });
            setFlowState('landing');
        }
    };

    const handleImageAnalysis = async (base64: string) => {
        setFlowState('compiling');
        try {
            const res = await generateSmartJobFromImageAction(base64, selectedCategory!);
            if (res.success && res.data) {
                setCompiledJob(res.data);
                setFlowState('review');
            } else {
                throw new Error(res.error || "Image analysis failed");
            }
        } catch (error) {
            toast({ title: "Visual Analysis Failed", description: "Could not process your image.", variant: "destructive" });
            setFlowState('landing');
        }
    };

    const runInitialCompilation = async () => {
        try {
            const res = await fetch('/api/ai/compile-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: selectedCategory, answers }),
            });

            if (!res.ok) throw new Error('Compilation failed');

            const data = await res.json();
            setCompiledJob(data);
            setFlowState('review');
        } catch (error) {
            toast({ title: "Compilation Failed", description: "AI could not process your request.", variant: "destructive" });
            setFlowState('questions');
        }
    };

    const handleRecompile = async (userEdit: string, currentDesc: string) => {
        const res = await fetch('/api/ai/compile-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: selectedCategory,
                answers,
                userEdit,
                currentJobDescription: currentDesc
            }),
        });

        if (!res.ok) throw new Error('Recompile failed');
        return await res.json();
    };

    const handlePostJob = async (finalData: CompileOutput) => {
        if (!user || !db) {
            toast({ title: "Authentication Required", description: "Please log in to post a job.", variant: "destructive" });
            return;
        }

        try {
            const draftData = {
                title: finalData.jobTitle,
                description: finalData.jobDescription,
                jobCategory: selectedCategory!,
                skills: finalData.skills || [],
                budget: finalData.priceEstimate ? {
                    min: finalData.priceEstimate.min,
                    max: finalData.priceEstimate.max
                } : undefined,
            };

            // Save final draft, reusing wizard draft ID if one exists
            await saveDraft(db, user.id, draftData, wizardDraftId || undefined);
            toast({ title: "Draft Saved", description: "Redirecting to final review..." });
            router.push('/dashboard/post-job?wizardCompleted=true');
        } catch (error) {
            toast({ title: "Error", description: "Failed to save job details.", variant: "destructive" });
        }
    };

    const handleBulkUpload = (jobs: any[]) => { setBulkJobs(jobs); };
    const handleRemoveBulkJob = (index: number) => { setBulkJobs(prev => prev.filter((_, i) => i !== index)); };
    const handlePostAllBulk = async () => {
        if (!user) return;
        setIsSubmittingBulk(true);
        try {
            const { createBulkJobsAction } = await import('@/app/actions/ai.actions');
            await createBulkJobsAction(bulkJobs);
            toast({ title: "Success", description: `${bulkJobs.length} jobs posted successfully!` });
            router.push('/dashboard');
        } catch (err) {
            toast({ title: "Error", description: "Failed to post bulk jobs.", variant: "destructive" });
        } finally { setIsSubmittingBulk(false); }
    };

    const handleSavePatternAsTemplate = async () => {
        if (!patternSuggestion) return;
        try {
            await savePersonalTemplateAction({
                name: patternSuggestion.templateName,
                description: patternSuggestion.templateDescription,
                category: selectedCategory!,
                defaultAnswers: patternSuggestion.suggestedAnswers
            });
            toast({ title: "Template Saved", description: "You can now use your new template." });
            setPatternSuggestion(null);
            const tRes = await getTemplatesAction(selectedCategory!);
            if (tRes.success && tRes.data) setTemplates(tRes.data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
        }
    };

    // --- Render ---

    if (flowState === 'category') {
        return (
            <div className="min-h-screen bg-background py-12 flex flex-col items-center justify-center">
                <CategorySelectionStep 
                    categories={aiTemplateService.getCategories()} 
                    onSelect={handleCategorySelect} 
                />
            </div>
        );
    }

    if (flowState === 'compiling') {
        return <LoadingCompiler />;
    }

    if (flowState === 'review' && compiledJob) {
        return (
            <JobReviewStep
                initialData={compiledJob}
                rawAnswers={answers}
                selectedCategory={selectedCategory!}
                onRecompile={handleRecompile}
                onPostJob={handlePostJob}
            />
        );
    }

    if (flowState === 'voice') {
        return <VoiceStep onBack={handleBack} onAnalyze={handleVoiceAnalysis} category={selectedCategory!} />;
    }

    if (flowState === 'image') {
        return <ImageStep onBack={handleBack} onAnalyze={handleImageAnalysis} category={selectedCategory!} />;
    }

    if (flowState === 'landing' || flowState === 'bulk' || flowState === 'split') {
        return (
            <div className="min-h-screen bg-background py-8">
                <div className="container mx-auto px-4 max-w-6xl">
                    <Button variant="ghost" onClick={handleBack} className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Change Category
                    </Button>

                    <AnimatePresence>
                        {patternSuggestion && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                                <Card className="p-4 border-primary/40 bg-primary/5 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                        <div>
                                            <p className="text-sm font-medium">Smart Suggestion: Save &quot;{patternSuggestion.templateName}&quot;?</p>
                                            <p className="text-xs text-muted-foreground">{patternSuggestion.templateDescription}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPatternSuggestion(null)}> <X className="h-4 w-4 mr-1" /> Dismiss </Button>
                                        <Button size="sm" onClick={handleSavePatternAsTemplate}> <Save className="h-4 w-4 mr-1" /> Save as Template </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight">{selectedCategory} Wizard</h1>
                        <p className="text-muted-foreground mt-2">Choose how you want to create your job work.</p>
                    </div>

                    <Tabs value={flowState === 'landing' ? 'landing' : flowState} onValueChange={(v: any) => setFlowState(v)} className="w-full">
                        <div className="flex justify-center mb-12">
                            <TabsList className="bg-muted p-1 rounded-xl">
                                <TabsTrigger value="landing" className="rounded-lg px-8">Classic</TabsTrigger>
                                <TabsTrigger value="bulk" className="rounded-lg px-8">Bulk Spreadsheet</TabsTrigger>
                                <TabsTrigger value="split" className="rounded-lg px-8"> <Sparkles className="h-3 w-3 mr-2" /> AI Smart Split </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="landing" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                <Card 
                                    className="p-6 cursor-pointer hover:border-primary/50 transition-all border-2 border-transparent bg-primary/5 text-center group"
                                    onClick={() => setFlowState('questions')}
                                >
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                        <Sparkles className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Step-by-Step</h3>
                                    <p className="text-sm text-muted-foreground">Answer simple questions to build your post.</p>
                                </Card>

                                <Card 
                                    className="p-6 cursor-pointer hover:border-primary/50 transition-all border-2 border-transparent bg-secondary/5 text-center group"
                                    onClick={() => setFlowState('voice')}
                                >
                                    <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                                        <Mic className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Voice Recording</h3>
                                    <p className="text-sm text-muted-foreground">Speak your requirements and let AI do the rest.</p>
                                </Card>

                                <Card 
                                    className="p-6 cursor-pointer hover:border-primary/50 transition-all border-2 border-transparent bg-accent/5 text-center group"
                                    onClick={() => setFlowState('image')}
                                >
                                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                                        <Camera className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Visual AI</h3>
                                    <p className="text-sm text-muted-foreground">Upload a photo of the site or equipment.</p>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <h3 className="font-bold text-xl text-center">Or Start with a Template</h3>
                                {isLoadingData ? (
                                    <div className="text-center py-20 opacity-50">Loading templates...</div>
                                ) : (
                                    <TemplateSelectionStep templates={templates} onSelect={handleTemplateSelect} />
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="bulk" className="mt-0">
                            <div className="space-y-12">
                                <BulkUploadZone template={templates[0]} onUploadSuccess={handleBulkUpload} />
                                {bulkJobs.length > 0 && (
                                    <BulkReviewGrid jobs={bulkJobs} onRemove={handleRemoveBulkJob} onSubmitAll={handlePostAllBulk} isSubmitting={isSubmittingBulk} />
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="split" className="mt-0">
                            <div className="space-y-12">
                                <SmartSplitZone onSplitSuccess={handleBulkUpload} />
                                {bulkJobs.length > 0 && <BulkReviewGrid jobs={bulkJobs} onRemove={handleRemoveBulkJob} onSubmitAll={handlePostAllBulk} isSubmitting={isSubmittingBulk} />}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-background py-12">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold tracking-tight">{selectedCategory} Setup</h1>
                    <p className="text-muted-foreground mt-2">Answer a few simple questions to get Professionals.</p>
                </div>

                {currentQuestion && (
                    <FixedQuestionStep
                        question={currentQuestion}
                        currentAnswer={answers[currentQuestion.id]}
                        onAnswer={handleAnswer}
                        onNext={handleNext}
                        onBack={handleBack}
                        isFirst={currentQuestionIndex === 0}
                        isLast={currentQuestionIndex === questions.length - 1}
                        stepIndex={currentQuestionIndex}
                        totalSteps={questions.length}
                    />
                )}
            </div>
        </div>
    );
}
