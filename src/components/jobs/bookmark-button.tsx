"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore } from "@/hooks/use-user";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BookmarkButtonProps {
    jobId: string;
    className?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
}

export function BookmarkButton({ jobId, className, variant = "ghost", size = "icon" }: BookmarkButtonProps) {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const isBookmarked = React.useMemo(() => {
        return user?.bookmarks?.includes(jobId) || false;
    }, [user?.bookmarks, jobId]);

    const toggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || !db) {
            toast({
                title: "Sign in required",
                description: "Please sign in to bookmark jobs.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const userRef = doc(db, "users", user.id);

            if (isBookmarked) {
                await updateDoc(userRef, {
                    bookmarks: arrayRemove(jobId)
                });
                toast({
                    description: "Job removed from bookmarks.",
                });
            } else {
                await updateDoc(userRef, {
                    bookmarks: arrayUnion(jobId)
                });
                toast({
                    description: "Job saved to bookmarks.",
                });
            }
        } catch (error) {
            console.error("Error toggling bookmark:", error);
            toast({
                title: "Error",
                description: "Failed to update bookmark.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={cn("text-muted-foreground hover:text-foreground", isBookmarked && "text-primary hover:text-primary", className)}
            onClick={toggleBookmark}
            disabled={isLoading}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark job"}
        >
            <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-current")} />
        </Button>
    );
}
