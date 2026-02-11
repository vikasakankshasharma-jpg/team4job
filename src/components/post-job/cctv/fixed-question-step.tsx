
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
            <div className="mb-8">
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                    <span>{tJob('stepOfTotal', { step: stepIndex + 1, total: totalSteps })}</span>
                    <span>{tJob('percentCompleted', { percent: Math.round(progress) })}</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="p-6 shadow-lg border-2 border-primary/5">
                    <h2 className="text-xl font-bold text-center mb-6 text-foreground">
                        {question.label}
                    </h2>

                    <div className="space-y-3">
                        {question.options.map((option) => {
                            const isSelected = currentAnswer === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onAnswer(option.value);
                                    }}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between
                    ${isSelected
                                            ? "border-primary bg-primary/5 shadow-md"
                                            : "border-muted bg-card hover:border-primary/50 hover:bg-accent"
                                        }
                   `}
                                >
                                    <span className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                                        {option.label}
                                    </span>
                                    {isSelected && (
                                        <div className="h-4 w-4 rounded-full bg-primary" />
                                    )}
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
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {tCommon('back')}
                        </Button>

                        <Button
                            onClick={onNext}
                            disabled={!currentAnswer}
                            className="px-8"
                            size="lg"
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
