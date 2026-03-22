import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { CommunicationItem } from "@/lib/services/timeline-builder";
import { User } from "@/lib/types";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Send, Loader2, Paperclip, FileIcon, X } from "lucide-react";
import { toDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";
import { sendMessageAction } from "@/app/actions/job.actions";

interface CommunicationFeedProps {
    jobId: string;
    currentUser: User;
    otherParticipant?: User;  // The Professional (if known)
}

export function CommunicationFeed({
    jobId,
    currentUser,
    otherParticipant
}: CommunicationFeedProps) {
    const { db, storage } = useFirebase();
    const [messages, setMessages] = useState<CommunicationItem[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [showUpload, setShowUpload] = useState(false);
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
        if ((!newMessage.trim() && selectedFiles.length === 0) || !db || sending) return;

        setSending(true);
        try {
            let attachmentUrls: { fileName: string; fileUrl: string; fileType: string; }[] = [];

            if (selectedFiles.length > 0 && storage) {
                const uploadPromises = selectedFiles.map(async (file) => {
                    const storageRef = ref(storage, `jobs/${jobId}/messages/${Date.now()}-${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
                });
                attachmentUrls = await Promise.all(uploadPromises);
            }

            const res = await sendMessageAction(
                jobId,
                currentUser.id,
                newMessage.trim(),
                attachmentUrls
            );

            if (!res.success) throw new Error(res.error);

            setNewMessage('');
            setSelectedFiles([]);
            setShowUpload(false);
        } catch (error) {
            // Error handled by client logic or reported to UI if needed
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
            <ScrollArea className="h-[400px] pr-4 border rounded-md p-4 bg-muted/10" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Send className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No messages yet</p>
                            <p className="text-xs mt-1">Start a conversation with your Professional</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isOwn = msg.author === currentUser.id;
                            const isSystem = msg.author === 'system';

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center">
                                        <div className="bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground max-w-[80%] text-center border">
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        {!isOwn && otherParticipant ? (
                                            <AnimatedAvatar svg={otherParticipant.realAvatarUrl || otherParticipant.avatarUrl} />
                                        ) : null}
                                        <AvatarFallback>
                                            {isOwn ? 'You' : (msg.authorName?.substring(0, 2) || 'IN')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("flex flex-col gap-1 max-w-[75%]", isOwn && "items-end")}>
                                        <div className={cn(
                                            "rounded-lg px-3 py-2 text-sm break-words shadow-sm",
                                            isOwn
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background border"
                                        )}>
                                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className={cn("mt-2 space-y-2", msg.content && "border-t pt-2 mt-2")}>
                                                    {msg.attachments.map((file, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={file.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded text-xs transition-colors",
                                                                isOwn ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"
                                                            )}
                                                        >
                                                            <FileIcon className="h-3 w-3" />
                                                            <span className="truncate max-w-[150px]">{file.fileName}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground px-1 opacity-70">
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
            <div className="space-y-2">
                {showUpload && (
                    <div className="p-2 border rounded-md bg-background relative animate-in fade-in slide-in-from-bottom-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-6 w-6 z-10"
                            onClick={() => setShowUpload(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <FileUpload onFilesChange={setSelectedFiles} maxFiles={3} />
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowUpload(!showUpload)}
                        className={cn(showUpload && "bg-accent", "shrink-0")}
                        title="Attach files"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
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
                        disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
                        size="icon"
                        className="shrink-0"
                    >
                        {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
