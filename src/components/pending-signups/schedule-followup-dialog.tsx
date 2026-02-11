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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SignupPriority } from "@/lib/types";

interface ScheduleFollowUpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSchedule: (data: {
        date: Date;
        time: string;
        priority: SignupPriority;
        notes: string;
        nextAction: string;
    }) => void;
    userName?: string;
}

export function ScheduleFollowUpDialog({
    open,
    onOpenChange,
    onSchedule,
    userName = "user",
}: ScheduleFollowUpDialogProps) {
    const [date, setDate] = useState<Date>();
    const [time, setTime] = useState("14:00");
    const [priority, setPriority] = useState<SignupPriority>("medium");
    const [notes, setNotes] = useState("");
    const [nextAction, setNextAction] = useState("Follow up call");
    const t = useTranslations("admin.pendingSignups.dialogs.schedule");
    const tPriority = useTranslations("admin.pendingSignups.badges.priority");

    const handleSubmit = () => {
        if (!date) return;

        const [hours, minutes] = time.split(":");
        const scheduledDate = new Date(date);
        scheduledDate.setHours(parseInt(hours), parseInt(minutes));

        onSchedule({
            date: scheduledDate,
            time,
            priority,
            notes,
            nextAction,
        });

        // Reset form
        setDate(undefined);
        setTime("14:00");
        setPriority("medium");
        setNotes("");
        setNextAction("Follow up call");
        onOpenChange(false);
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
                    {/* Date Picker */}
                    <div className="grid gap-2">
                        <Label htmlFor="date">{t("date")}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>{t("pickDate")}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time */}
                    <div className="grid gap-2">
                        <Label htmlFor="time">{t("time")}</Label>
                        <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>

                    {/* Priority */}
                    <div className="grid gap-2">
                        <Label htmlFor="priority">{t("priority")}</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as SignupPriority)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="high">{tPriority("high")}</SelectItem>
                                <SelectItem value="medium">{tPriority("medium")}</SelectItem>
                                <SelectItem value="low">{tPriority("low")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Next Action */}
                    <div className="grid gap-2">
                        <Label htmlFor="next-action">{t("nextAction")}</Label>
                        <Input
                            id="next-action"
                            value={nextAction}
                            onChange={(e) => setNextAction(e.target.value)}
                            placeholder={t("nextActionPlaceholder")}
                        />
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t("notes")}</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("notesPlaceholder")}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={!date}>
                        {t("submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
