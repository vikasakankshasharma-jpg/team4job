
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from 'next-intl';

interface Option {
    value: string;
    label: string;
}

interface Question {
    id: string;
    label: string;
    options: Option[];
}

interface FixedQuestionStepProps {
    question: Question;
    currentAnswer: string | undefined;
    onAnswer: (answer: string) => void;
    onNext: () => void;
    onBack: () => void;
    isFirst: boolean;
    isLast: boolean;
    stepIndex: number;
    totalSteps: number;
}

export function FixedQuestionStep({
    question,
    currentAnswer,
    onAnswer,
    onNext,
    onBack,
    isFirst,
    isLast,
    stepIndex,
    totalSteps,
}: FixedQuestionStepProps) {
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');
    const progress = ((stepIndex + 1) / totalSteps) * 100;

    return (
        <div className="mx-auto w-full max-w-lg p-4">
            {/* Progress Bar */}
            <div className="mb-10">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 opacity-70">
                    <span>{tJob('stepOfTotal', { step: stepIndex + 1, total: totalSteps })}</span>
                    <span>{Math.round(progress)}% {tCommon('completed') || 'Completed'}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-primary"
                    />
                </div>
            </div>

            <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="p-8 shadow-2xl border-0 bg-card overflow-hidden relative">
                    {/* Subtle Top Accent */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10" />
                    
                    <h2 className="text-2xl font-extrabold text-center mb-8 tracking-tight">
                        {question.label}
                    </h2>
 
                    <div className="space-y-4">
                        {question.options.map((option) => {
                            const isSelected = currentAnswer === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onAnswer(option.value);
                                    }}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group active:scale-[0.99]
                    ${isSelected
                                            ? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/20"
                                            : "border-muted bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
                                        }
                   `}
                                    data-test-id={`question-option-${option.value}`}
                                >
                                    <span className={`text-base font-bold transition-colors ${isSelected ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
                                        {option.label}
                                    </span>
                                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-primary bg-primary shadow-sm" : "border-muted group-hover:border-primary/50"}`}>
                                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            disabled={isFirst}
                            className={isFirst ? "invisible" : ""}
                            data-testid="wizard-back-button"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {tCommon('back')}
                        </Button>

                        <Button
                            onClick={onNext}
                            disabled={!currentAnswer}
                            className="px-8"
                            size="lg"
                            data-testid="wizard-next-button"
                        >
                            {isLast ? tJob('reviewRequirement') : tCommon('next')}
                            {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
