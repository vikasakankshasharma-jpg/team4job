"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Headphones, Phone, Mail, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportChatbot } from "./support-chatbot";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";


export function SupportDialog() {
    const t = useTranslations('dashboard.support');

    return (
        <Dialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <button
                            className="flex h-12 w-12 items-center justify-center rounded-[1rem] text-muted-foreground transition-all duration-300 hover:text-primary hover:bg-primary/5 md:h-10 md:w-10 ring-1 ring-white/5 active:scale-95 shadow-inner"
                        >
                            <Headphones className="h-5 w-5" />
                            <span className="sr-only">{t('srOnly')}</span>
                        </button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">{t('tooltip')}</TooltipContent>
            </Tooltip>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            AI Support Assistant
                        </p>
                        <SupportChatbot />
                    </div>

                    <div className="flex items-center gap-6 rounded-[1.5rem] border border-white/5 p-6 bg-surface-container-low/40 shadow-inner">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
                            <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">{t('phoneLabel')}</p>
                            <p className="text-sm text-muted-foreground">{t('phoneDesc')}</p>
                        </div>
                        <a href="tel:9587980007" className={cn(buttonVariants({ variant: "outline" }))}>
                            9587980007
                        </a>
                    </div>
                    <div className="flex items-center gap-6 rounded-[1.5rem] border border-white/5 p-6 bg-surface-container-low/40 shadow-inner">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">{t('emailLabel')}</p>
                            <p className="text-sm text-muted-foreground">{t('emailDesc')}</p>
                        </div>
                        <a href="mailto:support@team4job.com" className={cn(buttonVariants({ variant: "outline" }))}>
                            {t('emailButton')}
                        </a>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
