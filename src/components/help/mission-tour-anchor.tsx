"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHelpStore } from '@/store/help-store';
import { MISSION_TOURS } from './mission-data';
import { Button } from '@/components/ui/button';
import { ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';

export function MissionTourAnchor() {
    const { activeTourId, currentStep, nextStep, prevStep, endTour } = useHelpStore();
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const requestRef = useRef<number>();

    const activeTour = MISSION_TOURS.find(t => t.id === activeTourId);
    const step = activeTour?.steps[currentStep];

    const updateAnchor = () => {
        if (step?.targetId) {
            let element = document.getElementById(step.targetId);
            
            // Fallback to data-tour attribute if ID not found
            if (!element) {
                element = document.querySelector(`[data-tour="${step.targetId}"]`);
            }

            if (element) {
                const rect = element.getBoundingClientRect();
                setAnchorRect(rect);
            } else {
                setAnchorRect(null);
            }
        } else {
            setAnchorRect(null);
        }
        requestRef.current = requestAnimationFrame(updateAnchor);
    };

    useEffect(() => {
        if (activeTourId) {
            requestRef.current = requestAnimationFrame(updateAnchor);
        } else {
            setAnchorRect(null);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [activeTourId, step]);

    if (!activeTour || !step || !anchorRect) return null;

    const isLastStep = currentStep === activeTour.steps.length - 1;

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Dark Overlay with Circle cutout */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-500"
                style={{
                    clipPath: `path('M 0 0 h 4000 v 4000 h -4000 z M ${anchorRect.left - 10} ${anchorRect.top - 10} q 0 -10 10 -10 h ${anchorRect.width} q 10 0 10 10 v ${anchorRect.height} q 0 10 -10 10 h -${anchorRect.width} q -10 0 -10 -10 z')`,
                    fillRule: 'evenodd'
                }}
            />

            {/* Beam Glow Frame */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1,
                    top: anchorRect.top - 15,
                    left: anchorRect.left - 15,
                    width: anchorRect.width + 30,
                    height: anchorRect.height + 30
                }}
                className="absolute border-2 border-primary shadow-[0_0_30px_rgba(var(--primary),0.5)] rounded-[2rem] pointer-events-none"
            >
                <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-[2rem]" />
            </motion.div>

            {/* High-Authority Briefing Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                    opacity: 1, 
                    y: 0,
                    top: anchorRect.bottom + 40,
                    left: Math.max(20, Math.min(window.innerWidth - 340, anchorRect.left + anchorRect.width / 2 - 160))
                }}
                className="absolute w-[320px] bg-surface-container-low/95 backdrop-blur-3xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/10 p-8 pointer-events-auto"
            >
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                        Step {currentStep + 1} of {activeTour.steps.length} {/* Intel Briefing */}
                    </span>
                    <button onClick={endTour} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                
                <h4 className="text-lg font-black italic tracking-tighter uppercase mb-2">
                    {step.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-medium">
                    {step.content}
                </p>

                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={currentStep === 0}
                            onClick={prevStep}
                            className="h-10 w-10 rounded-[1.25rem] bg-muted/20"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={isLastStep ? endTour : nextStep}
                            className="h-10 w-10 rounded-[1.25rem] bg-muted/20"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        onClick={isLastStep ? endTour : nextStep}
                        className="h-10 rounded-[1.25rem] px-6 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.05]"
                    >
                        {isLastStep ? 'Complete Mission' : 'Next Intel'} 
                        {!isLastStep && <ArrowRight className="ml-2 h-3 w-3" />}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
