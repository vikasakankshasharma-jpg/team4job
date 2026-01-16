
import React, { useEffect, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
    SelectSeparator
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import {
    getBudgetTemplates,
    saveBudgetTemplate,
    deleteTemplate,
    BudgetTemplate
} from "@/lib/api/budget-templates";
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
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface BudgetTemplateSelectorProps {
    onSelect: (template: BudgetTemplate) => void;
    currentValues?: { min: number; max: number };
}

export function BudgetTemplateSelector({ onSelect, currentValues }: BudgetTemplateSelectorProps) {
    const { user } = useUser();
    const { db } = useFirebase();
    const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    // Save Dialog State
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Manage Dialog State
    const [isManageOpen, setIsManageOpen] = useState(false);

    // Load templates
    useEffect(() => {
        if (!user) return;
        loadTemplates();
    }, [user]);

    const loadTemplates = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getBudgetTemplates(db, user.id);
            setTemplates(data);
        } catch (error) {
            console.error("Failed to load budget templates", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!user || !newTemplateName || !currentValues) return;

        setIsSaving(true);
        try {
            await saveBudgetTemplate(db, user.id, {
                name: newTemplateName,
                min: currentValues.min,
                max: currentValues.max,
                frequency: 'fixed' // Default for now
            });

            toast({ title: "Template Saved", description: "Budget range saved for future use." });
            setNewTemplateName("");
            setIsSaveOpen(false);
            loadTemplates();
        } catch (error) {
            toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        try {
            await deleteTemplate(db, user.id, id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast({ title: "Template Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Select onValueChange={(val) => {
                if (val === 'save_new') {
                    setIsSaveOpen(true);
                } else if (val === 'manage') {
                    setIsManageOpen(true);
                } else {
                    const template = templates.find(t => t.id === val);
                    if (template) onSelect(template);
                }
            }}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Load Budget..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Saved Budgets</SelectLabel>
                        {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                                <span>{t.name}</span>
                                <span className="ml-2 text-muted-foreground text-[10px]">
                                    (₹{t.min / 1000}k - ₹{t.max / 1000}k)
                                </span>
                            </SelectItem>
                        ))}
                        {templates.length === 0 && (
                            <div className="p-2 text-[10px] text-muted-foreground text-center">No saved budgets</div>
                        )}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                        <SelectItem value="save_new" className="text-xs font-medium text-primary">
                            <div className="flex items-center gap-2">
                                <Plus className="h-3 w-3" /> Save Selection
                            </div>
                        </SelectItem>
                        {templates.length > 0 && (
                            <SelectItem value="manage" className="text-xs">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-3 w-3" /> Manage List
                                </div>
                            </SelectItem>
                        )}
                    </SelectGroup>
                </SelectContent>
            </Select>

            {/* Save Template Dialog */}
            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Budget Template</DialogTitle>
                        <DialogDescription>
                            Save this price range to quickly use it later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Template Name</Label>
                            <Input
                                placeholder="e.g. Standard 4-Camera Install"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Range:</span> ₹{currentValues?.min} - ₹{currentValues?.max}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTemplate} disabled={!newTemplateName || isSaving}>
                            {isSaving ? "Saving..." : "Save Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Templates Dialog */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Budget Templates</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {templates.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                    <div className="font-medium text-sm">{t.name}</div>
                                    <div className="text-xs text-muted-foreground">₹{t.min} - ₹{t.max}</div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(t.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
