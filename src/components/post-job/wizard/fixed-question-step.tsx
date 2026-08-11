
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
                <Card className="p-12 shadow-[0_45px_120px_rgba(0,0,0,0.2)] border-none bg-card/40 backdrop-blur-3xl overflow-hidden relative rounded-[3.5rem] ring-1 ring-white/5">
                    {/* Subtle Top Accent */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-primary/20" />
                    
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-10 leading-none">
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
                                    className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-500 flex items-center justify-between group active:scale-[0.99] font-black italic uppercase tracking-[0.2em] text-[11px]
                    ${isSelected
                                            ? "border-primary bg-primary/10 shadow-[0_20px_50px_rgba(var(--primary),0.2)] ring-2 ring-primary/20"
                                            : "border-white/5 bg-background/20 hover:border-primary/40 hover:bg-background/40 shadow-inner"
                                        }
                   `}
                                    data-testid={`question-option-${option.value}`}
                                >
                                    <span className={`transition-colors ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}>
                                        {option.label}
                                    </span>
                                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-primary bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "border-white/10 group-hover:border-primary/50 shadow-inner"}`}>
                                        {isSelected && <div className="h-3 w-3 rounded-full bg-primary-foreground shadow-sm" />}
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
