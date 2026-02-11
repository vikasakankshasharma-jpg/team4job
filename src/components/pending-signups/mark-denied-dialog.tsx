"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("admin.pendingSignups.dialogs.deny");

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
        not_interested: t("reasons.not_interested"),
        too_expensive: t("reasons.too_expensive"),
        found_alternative: t("reasons.found_alternative"),
        technical_issues: t("reasons.technical_issues"),
        trust_concerns: t("reasons.trust_concerns"),
        other: t("reasons.other"),
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description", { name: userName })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Reason */}
                    <div className="grid gap-2">
                        <Label htmlFor="reason">{t("reason")}</Label>
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
                            <Label htmlFor="custom-reason">{t("customReason")}</Label>
                            <Textarea
                                id="custom-reason"
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder={t("customReasonPlaceholder")}
                                rows={2}
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t("notes")}</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("notesPlaceholder")}
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={reason === "other" && !customReason}
                    >
                        {t("submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
