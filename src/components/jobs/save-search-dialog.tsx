"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUser, useFirestore } from "@/hooks/use-user";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SavedSearch } from "@/lib/types";

interface SaveSearchDialogProps {
    currentFilters: {
        query: string;
        minPrice: number;
        maxPrice: number;
        skills: string[];
    };
    trigger?: React.ReactNode;
}

export function SaveSearchDialog({ currentFilters, trigger }: SaveSearchDialogProps) {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [name, setName] = React.useState("");
    const [frequency, setFrequency] = React.useState<SavedSearch["alertFrequency"]>("instant");

    const handleSave = async () => {
        if (!user || !db) return;
        if (!name.trim()) {
            toast({
                title: "Name required",
                description: "Please give your search a name.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const searchData: Omit<SavedSearch, "id"> = {
                userId: user.id,
                name: name,
                criteria: {
                    query: currentFilters.query || undefined,
                    minPrice: currentFilters.minPrice > 0 ? currentFilters.minPrice : undefined,
                    maxPrice: currentFilters.maxPrice < 150000 ? currentFilters.maxPrice : undefined,
                    skills: currentFilters.skills.length > 0 ? currentFilters.skills : undefined,
                },
                alertFrequency: frequency,
                active: true,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "saved_searches"), searchData);

            toast({
                title: "Search Saved",
                description: frequency === 'never'
                    ? "Search saved to your dashboard."
                    : "You will receive email alerts for new matching jobs.",
            });
            setOpen(false);
            setName("");
        } catch (error) {
            console.error("Error saving search:", error);
            toast({
                title: "Error",
                description: "Failed to save search. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">Alert Me</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Save Search & Alerts</DialogTitle>
                    <DialogDescription>
                        Save these filters to quickly find jobs later, or set up email alerts.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="e.g. CCTV in Bangalore"
                            className="col-span-3"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="frequency" className="text-right">
                            Alerts
                        </Label>
                        <Select
                            value={frequency}
                            onValueChange={(val: any) => setFrequency(val)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="instant">Instant Email (Recommended)</SelectItem>
                                <SelectItem value="daily">Daily Summary</SelectItem>
                                <SelectItem value="never">No Alerts (Save Only)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                        <strong>Saving Filters:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            {currentFilters.query && <li>Query: &quot;{currentFilters.query}&quot;</li>}
                            {currentFilters.skills.length > 0 && <li>Skills: {currentFilters.skills.join(", ")}</li>}
                            {(currentFilters.minPrice > 0 || currentFilters.maxPrice < 150000) && (
                                <li>Budget: ₹{currentFilters.minPrice.toLocaleString()} - ₹{currentFilters.maxPrice.toLocaleString()}</li>
                            )}
                            {!currentFilters.query && currentFilters.skills.length === 0 && currentFilters.minPrice === 0 && currentFilters.maxPrice === 150000 && (
                                <li>No specific filters (Alerts for all new jobs)</li>
                            )}
                        </ul>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Search
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
