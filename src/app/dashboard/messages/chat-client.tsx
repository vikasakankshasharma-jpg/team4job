
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useFirebase } from "@/hooks/use-user";
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, User as UserIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { moderateMessage } from "@/ai/flows/moderate-message";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "@/components/ui/use-toast";

type Message = {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
    status?: 'sent' | 'delivered' | 'read';
};

type Conversation = {
    id: string;
    participants: string[];
    participantDetails?: Record<string, { name: string; avatar?: string }>;
    lastMessage?: {
        text: string;
        senderId: string;
        createdAt: any;
    };
    updatedAt: any;
};

export default function ChatClient() {
    const { user, db } = useFirebase();
    const searchParams = useSearchParams();
    const initialRecipientId = searchParams.get('recipientId');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [moderationWarning, setModerationWarning] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Conversations
    useEffect(() => {
        if (!user || !db) return;

        console.log("Setting up conversation listener for user:", user.uid);
        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const convs = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                // Fetch details of OTHER participant
                const otherUid = data.participants.find((p: string) => p !== user.uid);
                let details = { name: 'User', avatar: '' };

                if (otherUid) {
                    try {
                        const uSnap = await getDoc(doc(db, 'users', otherUid));
                        if (uSnap.exists()) {
                            details = {
                                name: uSnap.data()?.name || 'User',
                                avatar: uSnap.data()?.photoURL || ''
                            };
                        }
                    } catch (e) {
                        console.error("Failed to fetch user details", e);
                    }
                }

                return {
                    id: docSnap.id,
                    ...data,
                    participantDetails: { [otherUid]: details }
                } as Conversation;
            }));
            setConversations(convs);
        });

        return () => unsubscribe();
    }, [user, db]);

    // 2. Handle Initial Recipient (Create/Open Chat from URL)
    useEffect(() => {
        if (!initialRecipientId || !user || !db || conversations.length === 0) return; // Wait for convs load? No, might need to create.

        // Actually, trigger creation if not exists
        const existing = conversations.find(c => c.participants.includes(initialRecipientId));
        if (existing) {
            setActiveConversationId(existing.id);
        } else {
            // Create phantom/optimistic ID or wait for user to send first message? 
            // Better: Create placeholder UI state. 
            // Implementing "Create New" logic on send.
        }
    }, [initialRecipientId, user, db, conversations.length]); // Dep check might be tricky

    // 3. Fetch Messages for Active Chat
    useEffect(() => {
        if (!activeConversationId || !db) return;

        const q = query(
            collection(db, 'conversations', activeConversationId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
            // Scroll to bottom
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });

        return () => unsubscribe();
    }, [activeConversationId, db]);

    // 4. Send Message (With Moderation)
    const handleSend = async () => {
        if (!inputText.trim() || !user || !db) return;
        setIsSending(true);
        setModerationWarning(null);

        try {
            // A. Moderation Check (Phase 13 Integration)
            // Call Server Action
            const modResult = await moderateMessage({ message: inputText, userId: user.uid });

            if (modResult.isFlagged) {
                setModerationWarning(modResult.reason || "Message flagged as unsafe.");
                setIsSending(false);
                return; // BLOCK SEND
            }

            // B. Resolve Conversation ID (Create if new)
            let currentConvId = activeConversationId;
            if (!currentConvId && initialRecipientId) {
                // Check exist again to be safe
                const existing = conversations.find(c => c.participants.includes(initialRecipientId));
                if (existing) {
                    currentConvId = existing.id;
                } else {
                    // Create New
                    const newConvRef = doc(collection(db, 'conversations')); // Auto ID
                    await setDoc(newConvRef, {
                        participants: [user.uid, initialRecipientId],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        lastMessage: { text: inputText, senderId: user.uid, createdAt: new Date() } // Optimistic
                    });
                    currentConvId = newConvRef.id;
                    setActiveConversationId(currentConvId);
                }
            }

            if (!currentConvId) {
                toast({ title: "Error", description: "No recipient selected.", variant: "destructive" });
                setIsSending(false);
                return;
            }

            // C. Send to Firestore
            await addDoc(collection(db, 'conversations', currentConvId, 'messages'), {
                text: inputText,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                status: 'sent'
            });

            // D. Update Last Message
            await setDoc(doc(db, 'conversations', currentConvId), {
                lastMessage: {
                    text: inputText,
                    senderId: user.uid,
                    createdAt: new Date() // Server timestamp better but for opti UI
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

            setInputText('');

        } catch (error) {
            console.error("Send failed", error);
            toast({ title: "Failed to send", description: "Network error.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    // UI Helpers
    const getOtherName = (c: Conversation) => {
        if (!user) return "User";
        const otherId = c.participants.find(p => p !== user.uid);
        return c.participantDetails?.[otherId!]?.name || "Unknown User";
    };

    const getOtherAvatar = (c: Conversation) => {
        if (!user) return "";
        const otherId = c.participants.find(p => p !== user.uid);
        return c.participantDetails?.[otherId!]?.avatar || "";
    };

    return (
        <div className="flex h-full border rounded-lg overflow-hidden bg-background shadow-sm">
            {/* Sidebar (Conversation List) */}
            <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b font-semibold bg-background">Messages</div>
                <ScrollArea className="flex-1">
                    <div className="space-y-1 p-2">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`w-full text-left p-3 rounded-md flex items-center space-x-3 transition-colors ${activeConversationId === conv.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                    }`}
                            >
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={getOtherAvatar(conv)} />
                                    <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-medium truncate">{getOtherName(conv)}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {conv.lastMessage?.senderId === user?.uid ? 'You: ' : ''}
                                        {conv.lastMessage?.text}
                                    </p>
                                </div>
                                {conv.updatedAt && (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(conv.updatedAt.toDate ? conv.updatedAt.toDate() : new Date(), { addSuffix: false })}
                                    </span>
                                )}
                            </button>
                        ))}
                        {conversations.length === 0 && !initialRecipientId && (
                            <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
                        )}
                        {/* Optimistic "New Chat" Entry */}
                        {!activeConversationId && initialRecipientId && !conversations.find(c => c.participants.includes(initialRecipientId!)) && (
                            <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100 m-2">
                                New Conversation with Recipient
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
                {activeConversationId || initialRecipientId ? (
                    <>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderId === user?.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-lg text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'
                                            }`}>
                                            {msg.text}
                                            <div className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(), { addSuffix: true }) : 'Sending...'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t bg-background">
                            {moderationWarning && (
                                <div className="mb-2 p-2 bg-red-50 text-red-600 text-xs rounded-md flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-2" />
                                    {moderationWarning}
                                </div>
                            )}
                            <div className="flex space-x-2">
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type a message..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    disabled={isSending}
                                />
                                <Button onClick={handleSend} disabled={isSending}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <Send className="h-8 w-8 opacity-20" />
                        </div>
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
