
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useHelp } from "@/hooks/use-help";
import { LifeBuoy } from "lucide-react";

export function HelpDialog({ children }: { children: React.ReactNode }) {
    const { title, content } = useHelp();

    if (!title || !content) {
        return null;
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LifeBuoy className="h-5 w-5 text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div>
                    {content}
                </div>
            </DialogContent>
        </Dialog>
    )
}
