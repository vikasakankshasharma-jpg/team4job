"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { Comment, Role } from "@/lib/types";
import { addJobCommentAction } from "@/app/actions/job.actions";
import { useToast } from "@/hooks/use-toast";
import { toDate } from "@/lib/utils";
import { MessageSquare, Send, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JobCommentsSectionProps {
    jobId: string;
    comments: Comment[];
    currentUserId: string;
    currentUserRole: Role;
    jobOwnerId: string;
}

export function JobCommentsSection({
    jobId,
    comments = [],
    currentUserId,
    currentUserRole,
    jobOwnerId,
}: JobCommentsSectionProps) {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const sortedComments = [...comments].sort((a, b) => {
        return toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime();
    });

    const handleSubmit = async () => {
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await addJobCommentAction(jobId, currentUserId, newComment);
            
            if (result.success) {
                setNewComment("");
                toast({
                    title: "Question posted",
                    description: "Your question has been added successfully.",
                });
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to post question.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 mt-8 border-t pt-8">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold">Public Q&A</h3>
                <Badge variant="outline" className="ml-2 rounded-full">
                    {comments.length}
                </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
                Ask a question about this job. All questions and answers will be public.
            </p>

            <div className="space-y-6">
                {sortedComments.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
                        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No questions yet. Be the first to ask!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedComments.map((comment) => (
                            <div key={comment.id} className={`flex gap-4 p-4 rounded-lg border ${comment.authorId === jobOwnerId ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={comment.authorAvatar} />
                                    <AvatarFallback>
                                        <User className="h-5 w-5 text-muted-foreground" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm">
                                            {comment.authorName}
                                        </span>
                                        {comment.authorId === jobOwnerId && (
                                            <Badge variant="default" className="text-[10px] h-5 px-1.5">
                                                Job Poster
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(toDate(comment.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-4 items-start pt-4">
                    <Avatar className="h-10 w-10 border hidden sm:flex">
                        <AvatarFallback>
                            <User className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                        <Textarea
                            placeholder={currentUserRole === "Professional" ? "Ask a question about the job requirements..." : "Reply or add more details about your job..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[100px] resize-none"
                        />
                        <div className="flex justify-end">
                            <Button 
                                onClick={handleSubmit} 
                                disabled={!newComment.trim() || isSubmitting}
                                className="gap-2"
                            >
                                {isSubmitting ? "Posting..." : "Post Question"}
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
