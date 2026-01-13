"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { DenialReason } from "@/lib/types";

interface MarkAsDeniedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeny: (data: { reason: DenialReason; customReason?: string; notes: string }) => void;
    userName?: string;
}

export function MarkAsDeniedDialog({
    open,
    onOpenChange,
    onDeny,
    userName = "user",
}: MarkAsDeniedDialogProps) {
    const [reason, setReason] = useState<DenialReason>("not_interested");
    const [customReason, setCustomReason] = useState("");
    const [notes, setNotes] = useState("");

    const handleSubmit = () => {
        onDeny({
            reason,
            customReason: reason === "other" ? customReason : undefined,
            notes,
        });

        // Reset form
        setReason("not_interested");
        setCustomReason("");
        setNotes("");
        onOpenChange(false);
    };

    const reasonLabels: Record<DenialReason, string> = {
        not_interested: "Not Interested",
        too_expensive: "Too Expensive",
        found_alternative: "Found Alternative Solution",
        technical_issues: "Technical Issues",
        trust_concerns: "Trust/Security Concerns",
        other: "Other Reason",
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Mark as Denied</DialogTitle>
                    <DialogDescription>
                        Record why {userName} declined to sign up
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Reason */}
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Denial Reason</Label>
                        <Select value={reason} onValueChange={(v) => setReason(v as DenialReason)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(reasonLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Custom Reason (if "Other") */}
                    {reason === "other" && (
                        <div className="grid gap-2">
                            <Label htmlFor="custom-reason">Specify Reason</Label>
                            <Textarea
                                id="custom-reason"
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Please specify the reason..."
                                rows={2}
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any additional context about why they declined..."
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={reason === "other" && !customReason}
                    >
                        Mark as Denied
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
