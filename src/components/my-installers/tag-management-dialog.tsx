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
import { useFirebase } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";
import {
    addInstallerTag,
    removeInstallerTag,
    getInstallerTags,
    COMMON_INSTALLER_TAGS,
} from "@/lib/services/installer-tags";
import { X, Plus, Tag } from "lucide-react";

interface TagManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    installer: User;
    currentUser: User;
    onTagsUpdated: () => void;
}

export function TagManagementDialog({
    isOpen,
    onClose,
    installer,
    currentUser,
    onTagsUpdated,
}: TagManagementDialogProps) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [newTag, setNewTag] = useState("");
    const [processing, setProcessing] = useState(false);

    const currentTags = getInstallerTags(currentUser, installer.id);

    const handleAddTag = async (tag: string) => {
        if (!tag.trim() || !db) return;

        const trimmedTag = tag.trim();

        // Don't add duplicates
        if (currentTags.includes(trimmedTag)) {
            toast({
                title: "Tag already exists",
                description: `"${trimmedTag}" is already added to this installer.`,
                variant: "destructive",
            });
            return;
        }

        try {
            setProcessing(true);
            await addInstallerTag(db, currentUser.id, installer.id, trimmedTag);

            toast({
                title: "Tag Added",
                description: `Added "${trimmedTag}" to ${installer.name}`,
            });

            setNewTag("");
            onTagsUpdated();
        } catch (error) {
            console.error("Error adding tag:", error);
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
            await removeInstallerTag(db, currentUser.id, installer.id, tag);

            toast({
                title: "Tag Removed",
                description: `Removed "${tag}" from ${installer.name}`,
            });

            onTagsUpdated();
        } catch (error) {
            console.error("Error removing tag:", error);
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
    const availableCommonTags = COMMON_INSTALLER_TAGS.filter(
        tag => !currentTags.includes(tag)
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Manage Tags for {installer.name}
                    </DialogTitle>
                    <DialogDescription>
                        Organize your installers with custom tags
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
                                No tags yet. Add some below to organize this installer.
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
                                {availableCommonTags.map(tag => (
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
