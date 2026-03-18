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
        setMounted(true);
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
        <div className="flex flex-col h-[400px] border rounded-lg bg-background shadow-sm overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex items-start gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn("flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={cn("rounded-lg px-3 py-2 text-sm max-w-[80%]", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-muted shadow">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-3 border-t bg-muted/50">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2"
                >
                    <Input
                        placeholder="Type your question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="bg-background"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    );
}
