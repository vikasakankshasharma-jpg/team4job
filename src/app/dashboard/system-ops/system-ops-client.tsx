"use client";

import { useState, useTransition } from "react";
import { SystemLink, updateSystemLinksAction } from "@/app/actions/system-ops.actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Settings, Database, IndianRupee, AlertOctagon, Github, Triangle, MessageCircle, Cloud, Zap } from "lucide-react";
import Link from "next/link";

// Helper to map string icon names to Lucide components
const IconMap: Record<string, any> = {
    Database,
    IndianRupee,
    AlertOctagon,
    Github,
    Triangle,
    MessageCircle,
    Cloud,
    Zap
};

export function SystemOpsClient({ initialLinks }: { initialLinks: SystemLink[] }) {
    const [links, setLinks] = useState<SystemLink[]>(initialLinks);
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    // Local state for the form so we don't mutate the grid immediately
    const [formData, setFormData] = useState<SystemLink[]>(initialLinks);

    const handleSave = () => {
        startTransition(async () => {
            const { success, error } = await updateSystemLinksAction(formData);
            if (success) {
                setLinks(formData);
                setIsOpen(false);
                toast({
                    title: "Success",
                    description: "System links updated successfully.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error || "Failed to update system links.",
                });
            }
        });
    };

    const handleUrlChange = (id: string, newUrl: string) => {
        setFormData(prev => prev.map(link => 
            link.id === id ? { ...link, url: newUrl } : link
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (open) setFormData(links); // Reset form data when opening
                }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Settings className="w-4 h-4" />
                            Edit Configuration
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit External System Links</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {formData.map((link) => (
                                <div key={link.id} className="space-y-2">
                                    <Label htmlFor={link.id}>{link.title}</Label>
                                    <Input 
                                        id={link.id} 
                                        value={link.url}
                                        onChange={(e) => handleUrlChange(link.id, e.target.value)}
                                        placeholder="https://"
                                    />
                                    <p className="text-xs text-muted-foreground">{link.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.map((link) => {
                    const IconComponent = IconMap[link.iconName] || Zap;
                    return (
                        <Card key={link.id} className="relative group overflow-hidden border border-border/50 bg-background hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    <CardTitle className="text-lg">{link.title}</CardTitle>
                                </div>
                                <CardDescription className="pt-2">{link.description}</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button asChild variant="secondary" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                        Open Dashboard <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
