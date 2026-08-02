
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from "@/hooks/use-user";
import { useFirestore } from "@/infrastructure/firebase/client-provider";
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, User as UserIcon, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { moderateContentAction } from "@/app/actions/ai.actions";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "@/hooks/use-toast";

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
    const { user } = useUser();
    const db = useFirestore();
    const searchParams = useSearchParams();
    const initialRecipientId = searchParams.get('recipientId');
    const tError = useTranslations('errors');
    const t = useTranslations('messages');

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

        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.id),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const convs = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                // Fetch details of OTHER participant
                const otherUid = data.participants.find((p: string) => p !== user.id);
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
                        // Suppress fetch errors in production
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
    }, [initialRecipientId, user, db, conversations]); // Dep check might be tricky

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
            // A. Moderation Check (Phase 13 Integration)
            // Call Server Action
            const modRes = await moderateContentAction({ content: inputText, userId: user.id, limitType: "ai_chat" });

            if (modRes.success && modRes.data?.isFlagged) {
                setModerationWarning(modRes.data.reason || t('unsafeContent'));
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
                        participants: [user.id, initialRecipientId],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        lastMessage: { text: inputText, senderId: user.id, createdAt: new Date() } // Optimistic
                    });
                    currentConvId = newConvRef.id;
                    setActiveConversationId(currentConvId);
                }
            }

            if (!currentConvId) {
                toast({ title: t('title'), description: t('noRecipient'), variant: "destructive" });
                setIsSending(false);
                return;
            }

            // C. Send to Firestore
            await addDoc(collection(db, 'conversations', currentConvId, 'messages'), {
                text: inputText,
                senderId: user.id,
                createdAt: serverTimestamp(),
                status: 'sent'
            });

            // D. Update Last Message
            await setDoc(doc(db, 'conversations', currentConvId), {
                lastMessage: {
                    text: inputText,
                    senderId: user.id,
                    createdAt: new Date() // Server timestamp better but for opti UI
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

            setInputText('');

        } catch (error) {
            toast({ title: t('sendFailed'), description: tError('networkError'), variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    // UI Helpers
    const getOtherName = (c: Conversation) => {
        if (!user) return t('user');
        const otherId = c.participants.find(p => p !== user.id);
        return c.participantDetails?.[otherId!]?.name || t('unknownUser');
    };

    const getOtherAvatar = (c: Conversation) => {
        if (!user) return "";
        const otherId = c.participants.find(p => p !== user.id);
        return c.participantDetails?.[otherId!]?.avatar || "";
    };

    return (
        <div className="flex h-full font-sans selection:bg-blue-500 selection:text-white bg-surface-container-low/40 dark:bg-slate-900/60 text-on-surface border-none rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5 backdrop-blur-3xl max-w-full min-h-[75vh]">
            {/* Sidebar (Conversation List) */}
            <div className="w-1/3 border-r border-white/5 bg-surface-container/20 dark:bg-slate-900/40 flex flex-col backdrop-blur-3xl">
                <div className="p-10 border-b border-white/5">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-none">
                        {t('title')}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 italic mt-3">Intelligence Channel</p>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-1 p-2">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`w-full text-left p-6 rounded-[2rem] flex items-center space-x-6 transition-all duration-500 ${activeConversationId === conv.id ? 'bg-primary/10 text-primary ring-1 ring-primary/20 shadow-2xl' : 'hover:bg-background/5 opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <Avatar className="h-14 w-14 border border-white/10 shadow-xl ring-1 ring-white/5">
                                    <AvatarImage src={getOtherAvatar(conv)} />
                                    <AvatarFallback className="bg-primary/10 text-primary"><UserIcon className="h-6 w-6" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden space-y-1">
                                    <p className="font-black italic uppercase tracking-tight text-lg">{getOtherName(conv)}</p>
                                    <p className="text-xs font-medium opacity-60 truncate italic">
                                        {conv.lastMessage?.senderId === user?.id ? t('you') : ''}
                                        {conv.lastMessage?.text}
                                    </p>
                                </div>
                                {conv.updatedAt && (
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30 whitespace-nowrap italic">
                                        {formatDistanceToNow(conv.updatedAt.toDate ? conv.updatedAt.toDate() : new Date(), { addSuffix: false })}
                                    </span>
                                )}
                            </button>
                        ))}
                        {conversations.length === 0 && !initialRecipientId && (
                            <div className="p-4 text-center text-sm text-muted-foreground">{t('noConversations')}</div>
                        )}
                        {/* Optimistic "New Chat" Entry */}
                        {!activeConversationId && initialRecipientId && !conversations.find(c => c.participants.includes(initialRecipientId!)) && (
                            <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100 m-2">
                                {t('newConversation')}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-surface-container-low dark:bg-slate-900">
                {activeConversationId || initialRecipientId ? (
                    <>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderId === user?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg`}>
                                        <div className={`max-w-[75%] p-5 text-sm ring-1 ring-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover/msg:translate-y-[-2px] ${isMe ? 'bg-primary text-primary-foreground rounded-[1.8rem] rounded-tr-[0.4rem]' : 'bg-surface-container-high/60 backdrop-blur-3xl rounded-[1.8rem] rounded-tl-[0.4rem]'
                                            }`}>
                                            <p className="font-medium leading-relaxed italic opacity-90">{msg.text}</p>
                                            <div className={`text-[9px] mt-3 font-black uppercase tracking-widest opacity-40 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(), { addSuffix: true }) : t('sending')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-8 border-t border-white/5 bg-surface-container/10 dark:bg-slate-900/40 backdrop-blur-3xl">
                            {moderationWarning && (
                                <div className="mb-6 p-5 bg-destructive/10 text-destructive text-[11px] font-black uppercase tracking-widest rounded-[1.25rem] border border-destructive/20 flex items-center animate-pulse">
                                    <AlertTriangle className="h-4 w-4 mr-3" />
                                    {moderationWarning}
                                </div>
                            )}
                            <div className="flex space-x-4">
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={t('typeMessage')}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    disabled={isSending}
                                    className="h-16 rounded-[1.5rem] border-white/5 bg-surface-container-high/40 text-sm font-medium italic px-8 focus-visible:ring-1 focus-visible:ring-primary transition-all shadow-inner"
                                />
                                <Button onClick={handleSend} disabled={isSending} className="h-16 w-16 rounded-[1.5rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-105 transition-all active:scale-95 group">
                                    {isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                        <div className="bg-surface-container/20 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl backdrop-blur-3xl animate-pulse mb-8 relative z-10 ring-1 ring-white/5">
                            <Send className="h-16 w-16 opacity-30 text-primary" />
                        </div>
                        <p className="text-sm font-black italic uppercase tracking-[0.4em] opacity-30 relative z-10">{t('selectConversation')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
