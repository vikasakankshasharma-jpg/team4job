"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { aiSupportAction } from "@/app/actions/ai.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
    role: 'user' | 'model';
    content: string;
};

export function SupportChatbot() {
    const { user } = useUser();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "Hello! I'm your Team4Job AI Assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        queueMicrotask(() => {
            setMounted(true);
        });
    }, []);

    useEffect(() => {
        if (mounted && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, mounted]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !user) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const result = await aiSupportAction({
                message: userMessage,
                history: messages,
                userId: user.id
            });

            if (result.success && result.data) {
                setMessages(prev => [...prev, { role: 'model', content: result.data!.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again later." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "An unexpected error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-[500px] border-none bg-surface-container-low/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-gradient-x opacity-30" />
            
            <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-[1rem] bg-primary/10 text-primary shadow-inner">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black italic tracking-tighter uppercase leading-none mb-1">Intelligence Channel</h3>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 italic">Active Session // AI Protocol 01</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(var(--success),0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-success/60 italic">Online</span>
                </div>
            </header>

            <ScrollArea className="flex-1 p-8" ref={scrollRef}>
                <div className="space-y-6">
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex items-start gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn("flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-[1rem] border border-white/5 shadow-inner", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted/20")}>
                                {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                            </div>
                            <div className={cn("rounded-[1.25rem] px-6 py-4 text-sm max-w-[80%] shadow-lg transition-all", m.role === 'user' ? "bg-primary text-primary-foreground italic font-medium" : "bg-surface-container-high/60 backdrop-blur-md border border-white/5 font-medium leading-relaxed")}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4 animate-pulse">
                            <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-[1rem] border border-white/5 bg-muted/20 shadow-inner">
                                <Bot className="h-5 w-5 opacity-40" />
                            </div>
                            <div className="bg-surface-container-high/40 rounded-[1.25rem] px-6 py-4 text-sm flex items-center gap-3 italic font-black uppercase tracking-widest text-muted-foreground/30 text-[10px]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing Request...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-6 border-t border-white/5 bg-background/20 backdrop-blur-xl">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-4"
                >
                    <Input
                        placeholder="Type your question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="bg-surface-container-low/40 border-none rounded-[1.25rem] h-14 px-6 focus:ring-2 focus:ring-primary transition-all shadow-inner font-medium italic"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-14 w-14 rounded-[1.5rem] bg-primary shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all">
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    );
}
