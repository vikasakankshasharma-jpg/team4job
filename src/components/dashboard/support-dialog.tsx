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
import { Headphones, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function SupportDialog() {
    return (
        <Dialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <button
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                        >
                            <Headphones className="h-5 w-5" />
                            <span className="sr-only">Support</span>
                        </button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Contact Support</TooltipContent>
            </Tooltip>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Contact Support</DialogTitle>
                    <DialogDescription>
                        Choose how you&apos;d like to get in touch with our team.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4 rounded-md border p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">Phone Support</p>
                            <p className="text-sm text-muted-foreground">Available Mon-Fri, 9am-6pm</p>
                        </div>
                        <a href="tel:9587980007" className={cn(buttonVariants({ variant: "outline" }))}>
                            9587980007
                        </a>
                    </div>
                    <div className="flex items-center gap-4 rounded-md border p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">Email Support</p>
                            <p className="text-sm text-muted-foreground">Typical response time: 24h</p>
                        </div>
                        <a href="mailto:support@team4job.com" className={cn(buttonVariants({ variant: "outline" }))}>
                            Email Us
                        </a>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
