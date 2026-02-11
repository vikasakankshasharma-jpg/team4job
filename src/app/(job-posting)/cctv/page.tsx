
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FixedQuestionStep } from "@/components/post-job/cctv/fixed-question-step";
import { LoadingCompiler } from "@/components/post-job/cctv/loading-compiler";
import { JobReviewStep } from "@/components/post-job/cctv/job-review-step";
import cctvQuestions from "@/data/cctv-questions.json";

// Type matches the API output
type CompileOutput = {
    jobTitle: string;
    jobDescription: string;
    conflictWarning?: string;
    priceEstimate?: {
        min: number;
        max: number;
        currency: string;
    };
};

export default function CCTVJobPage() {
    const router = useRouter();

    // State 1: Fixed Questions
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // State 2: Compilation
    // 'questions' -> 'compiling' -> 'review'
    const [flowState, setFlowState] = useState<'questions' | 'compiling' | 'review'>('questions');

    // State 3: Review Data
    const [compiledJob, setCompiledJob] = useState<CompileOutput | null>(null);

    const questions = cctvQuestions.questions;
    const currentQuestion = questions[currentQuestionIndex];

    // --- Handlers ---

    const handleAnswer = (value: string) => {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    };

    const handleNext = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        } else {
            // Completed all questions -> Trigger AI Compiler
            setFlowState('compiling');
            await runInitialCompilation();
        }
    };

    const handleBack = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        } else {
            router.back();
        }
    };

    const runInitialCompilation = async () => {
        try {
            const res = await fetch('/api/ai/compile-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });

            if (!res.ok) throw new Error('Compilation failed');

            const data = await res.json();
            setCompiledJob(data);
            setFlowState('review');
        } catch (error) {
            console.error(error);
            // Fallback: Manually enable review state with partial data or show error
            // Ideally show error toast
            setFlowState('questions'); // reset on error for now
        }
    };

    const handleRecompile = async (userEdit: string, currentDesc: string) => {
        const res = await fetch('/api/ai/compile-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answers,
                userEdit,
                currentJobDescription: currentDesc
            }),
        });

        if (!res.ok) throw new Error('Recompile failed');
        return await res.json();
    };

    const handlePostJob = async (finalData: CompileOutput) => {
        // Phase 1: Just log it or mock post. 
        // Real implementation would call a server action to save to Firestore.
        console.log("POSTING FINAL JOB:", { ...finalData, structuredRequirements: answers });

        // Redirect to dashboard or success page
        // router.push('/dashboard/jobs');
        alert("Phase 1: Job would be posted now! Check console for data payload.");
    };

    // --- Render ---

    if (flowState === 'compiling') {
        return <LoadingCompiler />;
    }

    if (flowState === 'review' && compiledJob) {
        return (
            <JobReviewStep
                initialData={compiledJob}
                rawAnswers={answers}
                onRecompile={handleRecompile}
                onPostJob={handlePostJob}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background py-12">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold tracking-tight">CCTV Installation Request</h1>
                    <p className="text-muted-foreground mt-2">
                        Answer a few simple questions to get installers.
                    </p>
                </div>

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
            </div>
        </div>
    );
}
