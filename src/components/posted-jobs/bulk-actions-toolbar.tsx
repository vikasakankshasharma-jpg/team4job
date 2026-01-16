"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Archive, Trash2, X, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface BulkActionsToolbarProps {
    selectedCount: number;
    onArchive: () => Promise<void>;
    onDelete: () => Promise<void>;
    onClearSelection: () => void;
}

export function BulkActionsToolbar({
    selectedCount,
    onArchive,
    onDelete,
    onClearSelection,
}: BulkActionsToolbarProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleArchive = async () => {
        setIsArchiving(true);
        try {
            await onArchive();
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
            setShowDeleteDialog(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (selectedCount === 0) return null;

    return (
        <>
            <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-lg border-2 border-primary/20 w-[calc(100vw-2rem)] max-w-md sm:w-auto">
                <div className="flex items-center gap-2 sm:gap-4 px-3 py-2 sm:px-4 sm:py-3 justify-between sm:justify-start">
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                        {selectedCount} selected
                    </span>

                    <div className="h-6 w-px bg-border hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleArchive}
                            disabled={isArchiving || isDeleting}
                            className="h-10 px-3 sm:px-4"
                        >
                            {isArchiving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Archive className="h-4 w-4 sm:mr-2" />
                            )}
                            <span className="hidden sm:inline ml-2">Archive</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={isArchiving || isDeleting}
                            className="h-10 px-3 sm:px-4"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 sm:mr-2" />
                            )}
                            <span className="hidden sm:inline ml-2">Delete</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClearSelection}
                            disabled={isArchiving || isDeleting}
                            className="h-10 w-10 p-0"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </Card>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCount} job{selectedCount > 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. These jobs will be permanently deleted from your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
