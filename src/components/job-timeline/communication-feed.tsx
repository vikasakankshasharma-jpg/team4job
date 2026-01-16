"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useFirebase } from "@/hooks/use-user";
import { CommunicationItem } from "@/lib/services/timeline-builder";
import { User } from "@/lib/types";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp
} from "firebase/firestore";
import { Send, Loader2 } from "lucide-react";
import { toDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommunicationFeedProps {
    jobId: string;
    currentUser: User;
    otherParticipant?: User;  // The installer (if known)
}

export function CommunicationFeed({
    jobId,
    currentUser,
    otherParticipant
}: CommunicationFeedProps) {
    const { db } = useFirebase();
    const [messages, setMessages] = useState<CommunicationItem[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Real-time listener for messages
    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, `jobs/${jobId}/communications`),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as CommunicationItem));
            setMessages(msgs);
            setLoading(false);

            // Scroll to bottom when new messages arrive
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [db, jobId]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !db || sending) return;

        setSending(true);
        try {
            await addDoc(collection(db, `jobs/${jobId}/communications`), {
                jobId,
                type: 'job_giver_message',
                content: newMessage.trim(),
                author: currentUser.id,
                authorName: currentUser.name,
                timestamp: serverTimestamp(),
                read: false,
            });

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Message list */}
            <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Send className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No messages yet</p>
                            <p className="text-xs mt-1">Start a conversation with your installer</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isOwn = msg.author === currentUser.id;
                            const isSystem = msg.author === 'system';

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center">
                                        <div className="bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground max-w-[80%] text-center">
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        {!isOwn && otherParticipant && (
                                            <AnimatedAvatar svg={otherParticipant.realAvatarUrl} />
                                        )}
                                        <AvatarFallback>
                                            {isOwn ? 'You' : (msg.authorName?.substring(0, 2) || 'IN')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn && "items-end")}>
                                        <div className={cn(
                                            "rounded-lg px-3 py-2 text-sm break-words",
                                            isOwn
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground px-1">
                                            {formatDistanceToNow(toDate(msg.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            {/* Compose area */}
            <div className="flex gap-2">
                <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    className="flex-1"
                />
                <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    size="icon"
                >
                    {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
