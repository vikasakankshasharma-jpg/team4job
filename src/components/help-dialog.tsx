
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PlatformGuide } from "./dashboard/platform-guide";
import { useHelp } from "@/hooks/use-help";
import { HelpCircle, FileText, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HelpDialog({ children }: { children: React.ReactNode }) {
    const { title, content } = useHelp();

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        Help & Support
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue={title ? "context" : "guide"} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="context" disabled={!title} className="flex gap-2">
                            <FileText className="h-4 w-4" />
                            {title ? `Page Guide: ${title}` : "Current Page Guide"}
                        </TabsTrigger>
                        <TabsTrigger value="guide" className="flex gap-2">
                            <BookOpen className="h-4 w-4" />
                            Platform Manual
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="context" className="flex-1 overflow-y-auto p-1 mt-2 border rounded-md bg-muted/10">
                        {title ? (
                            <div className="p-4 space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2">{title}</h3>
                                {content}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4">
                                <p>No specific guide available for this page.</p>
                                <p className="text-sm">Please check the Platform Manual.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="guide" className="flex-1 overflow-hidden mt-2">
                        <PlatformGuide />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

