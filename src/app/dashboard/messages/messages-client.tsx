"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChatRooms, useChatStream } from "@/hooks/use-chat-stream";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Send, Image as ImageIcon, Paperclip, CheckCircle2, User as UserIcon } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { FileUpload } from "@/components/ui/file-upload";

export default function MessagesClient({ initialRoomId }: { initialRoomId?: string }) {
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId || null);
    const { rooms, loading: roomsLoading } = useChatRooms();
    const { messages, room, loading: msgsLoading, sendMessage } = useChatStream(selectedRoomId);
    
    const { user } = useUser();
    const [text, setText] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && files.length === 0) return;
        
        await sendMessage(text, files[0]);
        setText("");
        setFiles([]);
    };

    return (
        <div className="h-[calc(100vh-6rem)] grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Sidebar (Rooms) */}
            <Card className="col-span-1 border-none shadow-xl bg-surface-container-low/40 backdrop-blur-2xl flex flex-col overflow-hidden rounded-[2.5rem]">
                <div className="p-6 border-b border-white/5 bg-background/5">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Messages</h2>
                </div>
                <ScrollArea className="flex-1">
                    {roomsLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading chats...</div>
                    ) : rooms.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground opacity-50 italic uppercase font-bold text-sm">No active conversations.</div>
                    ) : (
                        <div className="flex flex-col p-4 gap-2">
                            {rooms.map(r => (
                                <button 
                                    key={r.id} 
                                    onClick={() => setSelectedRoomId(r.id)}
                                    className={`text-left p-5 rounded-3xl transition-all border ${selectedRoomId === r.id ? 'bg-primary/10 border-primary/20 scale-[0.98]' : 'bg-background/20 border-white/5 hover:bg-background/40 hover:scale-[1.02]'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold truncate text-sm flex-1 mr-2">{r.jobTitle || 'Job Chat'}</h4>
                                        <span className="text-[10px] opacity-40 font-black tracking-widest">{format(new Date(r.updatedAt), 'MMM d')}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{r.lastMessage || 'No messages yet.'}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </Card>

            {/* Main Chat Area */}
            <Card className="col-span-1 md:col-span-2 border-none shadow-xl bg-surface-container-low/40 backdrop-blur-2xl flex flex-col overflow-hidden rounded-[2.5rem]">
                {selectedRoomId ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-background/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-xl italic uppercase tracking-tighter">{room?.jobTitle || 'Chat'}</h3>
                                <p className="text-xs text-muted-foreground">End-to-end encrypted connection</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {msgsLoading ? (
                                <div className="text-center text-muted-foreground">Loading...</div>
                            ) : messages.map((m, i) => {
                                const isMe = m.senderId === user?.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-3xl p-5 ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-secondary-foreground rounded-tl-sm'}`}>
                                            {m.attachmentUrl && (
                                                <img src={m.attachmentUrl} alt="attachment" className="rounded-2xl mb-3 max-h-64 object-cover" />
                                            )}
                                            <p className="text-sm leading-relaxed">{m.text}</p>
                                            <div className={`text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-1 opacity-50 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {format(new Date(m.createdAt), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        <div className="p-6 border-t border-white/5 bg-background/5">
                            {files.length > 0 && (
                                <div className="mb-4 flex gap-4 bg-background/50 p-4 rounded-2xl">
                                    <p className="text-sm font-bold flex items-center gap-2">
                                        <Paperclip className="h-4 w-4 text-primary" /> {files[0].name}
                                    </p>
                                    <button type="button" onClick={() => setFiles([])} className="text-xs text-destructive hover:underline">Remove</button>
                                </div>
                            )}
                            <form onSubmit={handleSend} className="flex items-center gap-4">
                                <div className="relative">
                                    <input type="file" id="chat-file" className="hidden" onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} /><Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-2xl shrink-0 border-white/10" onClick={() => document.getElementById("chat-file")?.click()}><Paperclip className="h-5 w-5" /></Button>
                                </div>
                                <Input 
                                    value={text} 
                                    onChange={e => setText(e.target.value)} 
                                    placeholder="Type your message..." 
                                    className="flex-1 h-14 rounded-2xl bg-background/50 border-white/10"
                                />
                                <Button type="submit" size="icon" className="h-14 w-14 rounded-2xl shrink-0" disabled={!text.trim() && files.length === 0}>
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
                        <MessageSquareIcon className="h-24 w-24 mb-6 opacity-20" />
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Select a Conversation</h2>
                        <p className="text-sm">Choose a chat from the sidebar to start messaging.</p>
                    </div>
                )}
            </Card>
        </div>
    );
}

function MessageSquareIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    )
}


