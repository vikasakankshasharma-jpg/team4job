"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";
import {
    addProfessionalTag,
    removeProfessionalTag,
    getProfessionalTags,
    COMMON_PROFESSIONAL_TAGS,
} from "@/lib/services/professional-tags";
import { X, Plus, Tag } from "lucide-react";

interface TagManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    Professional: User;
    currentUser: User;
    onTagsUpdated: () => void;
}

export function TagManagementDialog({
    isOpen,
    onClose,
    Professional,
    currentUser,
    onTagsUpdated,
}: TagManagementDialogProps) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [newTag, setNewTag] = useState("");
    const [processing, setProcessing] = useState(false);

    const currentTags = getProfessionalTags(currentUser, Professional.id);

    const handleAddTag = async (tag: string) => {
        if (!tag.trim() || !db) return;

        const trimmedTag = tag.trim();

        // Don't add duplicates
        if (currentTags.includes(trimmedTag)) {
            toast({
                title: "Tag already exists",
                description: `"${trimmedTag}" is already added to this Professional.`,
                variant: "destructive",
            });
            return;
        }

        try {
            setProcessing(true);
            await addProfessionalTag(db, currentUser.id, Professional.id, trimmedTag);

            toast({
                title: "Tag Added",
                description: `Added "${trimmedTag}" to ${Professional.name}`,
            });

            setNewTag("");
            onTagsUpdated();
        } catch (error) {
           toast({
                title: "Error",
                description: "Failed to add tag. Please try again.",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveTag = async (tag: string) => {
        if (!db) return;

        try {
            setProcessing(true);
            await removeProfessionalTag(db, currentUser.id, Professional.id, tag);

            toast({
                title: "Tag Removed",
                description: `Removed "${tag}" from ${Professional.name}`,
            });

            onTagsUpdated();
        } catch (error) {
           toast({
                title: "Error",
                description: "Failed to remove tag. Please try again.",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && newTag.trim()) {
            e.preventDefault();
            handleAddTag(newTag);
        }
    };

    // Filter out common tags that are already added
    const availableCommonTags = COMMON_PROFESSIONAL_TAGS.filter(
        (tag: string) => !currentTags.includes(tag)
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Manage Tags for {Professional.name}
                    </DialogTitle>
                    <DialogDescription>
                        Organize your Professionals with custom tags
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current Tags */}
                    <div>
                        <Label>Current Tags</Label>
                        {currentTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {currentTags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="pl-3 pr-1 py-1">
                                        {tag}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-1 ml-1 hover:bg-transparent"
                                            onClick={() => handleRemoveTag(tag)}
                                            disabled={processing}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mt-2">
                                No tags yet. Add some below to organize this Professional.
                            </p>
                        )}
                    </div>

                    {/* Add New Tag */}
                    <div>
                        <Label htmlFor="new-tag">Add New Tag</Label>
                        <div className="flex gap-2 mt-2">
                            <Input
                                id="new-tag"
                                placeholder="e.g., Electrical, Trusted"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={processing}
                            />
                            <Button
                                onClick={() => handleAddTag(newTag)}
                                disabled={!newTag.trim() || processing}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Common Tags */}
                    {availableCommonTags.length > 0 && (
                        <div>
                            <Label>Quick Add (Common Tags)</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {availableCommonTags.map((tag: string) => (
                                    <Button
                                        key={tag}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddTag(tag)}
                                        disabled={processing}
                                        className="text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {tag}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
