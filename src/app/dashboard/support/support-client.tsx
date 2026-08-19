"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Plus, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createTicketAction, getUserTicketsAction, replyToTicketAction } from "@/app/actions/support.actions";
import { SupportTicket } from "@/domains/support/support.types";

export function SupportClient() {
  const { user } = useUser();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<any>("General");
  const [message, setMessage] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const loadTickets = async () => {
    if (!user) return;
    const res = await getUserTicketsAction(user.id);
    if (res.success && res.tickets) {
      setTickets(res.tickets as SupportTicket[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  const handleCreate = async () => {
    if (!subject || !message) {
      toast({ title: "Incomplete", description: "Subject and Message are required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const res = await createTicketAction({
      userId: user!.id,
      userName: user!.name,
      userEmail: user!.email,
      subject,
      category,
      message,
    });
    
    if (res.success) {
      toast({ title: "Ticket Created", description: "Our support team will respond shortly." });
      setIsNewOpen(false);
      setSubject("");
      setMessage("");
      loadTickets();
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleReply = async () => {
    if (!replyMessage || !selectedTicket) return;
    setIsSubmitting(true);
    const res = await replyToTicketAction(selectedTicket.id, user!.id, user!.name, 'user', replyMessage);
    if (res.success) {
      setReplyMessage("");
      // Optimistic update
      const newReply = { id: Date.now().toString(), authorId: user!.id, authorName: user!.name, authorRole: 'user' as const, message: replyMessage, createdAt: new Date().toISOString() };
      setSelectedTicket({...selectedTicket, replies: [...selectedTicket.replies, newReply]});
      loadTickets();
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (!user) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Support Center</h1>
          <p className="text-muted-foreground">Need help? Open a ticket and our team will assist you.</p>
        </div>
        
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest gap-2">
              <Plus className="h-4 w-4" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black italic uppercase">Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General Inquiry</SelectItem>
                    <SelectItem value="Billing">Billing & Payments</SelectItem>
                    <SelectItem value="Technical">Technical Issue</SelectItem>
                    <SelectItem value="Dispute">Job Dispute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-12 rounded-xl" placeholder="Brief summary of the issue" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[150px] rounded-xl resize-none" placeholder="Describe your issue in detail..." />
              </div>
              <Button onClick={handleCreate} disabled={isSubmitting} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <h2 className="font-bold uppercase tracking-widest text-xs text-muted-foreground ml-2">Your Tickets</h2>
          {isLoading ? (
             <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : tickets.length === 0 ? (
             <Card className="border-dashed bg-transparent shadow-none"><CardContent className="p-8 text-center text-muted-foreground text-sm">No tickets found.</CardContent></Card>
          ) : (
             <div className="space-y-3">
               {tickets.map(t => (
                 <Card 
                    key={t.id} 
                    className={`cursor-pointer transition-all hover:border-primary/50 ${selectedTicket?.id === t.id ? 'border-primary ring-1 ring-primary' : 'border-border/50'}`}
                    onClick={() => setSelectedTicket(t)}
                 >
                   <CardContent className="p-4">
                     <div className="flex items-center gap-2 mb-2">
                       {t.status === 'resolved' || t.status === 'closed' ? (
                         <CheckCircle2 className="h-4 w-4 text-green-500" />
                       ) : (
                         <Clock className="h-4 w-4 text-amber-500" />
                       )}
                       <span className="text-xs font-bold uppercase tracking-widest">{t.status.replace('_', ' ')}</span>
                     </div>
                     <h3 className="font-bold line-clamp-1">{t.subject}</h3>
                     <p className="text-xs text-muted-foreground mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                   </CardContent>
                 </Card>
               ))}
             </div>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedTicket ? (
            <Card className="border-border/50 shadow-xl rounded-[2rem] h-[600px] flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-muted/10 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-black">{selectedTicket.subject}</CardTitle>
                    <CardDescription className="mt-1">Ticket ID: {selectedTicket.id.substring(0,8).toUpperCase()} � {selectedTicket.category}</CardDescription>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedTicket.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                {selectedTicket.replies.map(reply => {
                  const isAdmin = reply.authorRole === 'admin';
                  return (
                    <div key={reply.id} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {isAdmin ? 'Support Team' : 'You'}
                          </span>
                       </div>
                       <div className={`p-4 rounded-2xl max-w-[85%] ${isAdmin ? 'bg-muted rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'}`}>
                         <p className="whitespace-pre-wrap text-sm leading-relaxed">{reply.message}</p>
                       </div>
                       <span className="text-[10px] text-muted-foreground mt-1 opacity-60">
                         {new Date(reply.createdAt).toLocaleString()}
                       </span>
                    </div>
                  );
                })}
              </CardContent>

              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-border/30 bg-muted/5 shrink-0">
                  <div className="flex gap-2">
                    <Textarea 
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-[60px] max-h-[120px] rounded-xl resize-none"
                    />
                    <Button 
                      onClick={handleReply}
                      disabled={isSubmitting || !replyMessage.trim()}
                      className="h-auto shrink-0 rounded-xl px-6 bg-primary text-primary-foreground"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="h-[600px] rounded-[2rem] border border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
              <MessageSquare className="h-12 w-12 opacity-20 mb-4" />
              <p>Select a ticket to view the conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
