"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllTicketsAction, replyToTicketAction, closeTicketAction } from "@/app/actions/support.actions";
import { SupportTicket } from "@/domains/support/support.types";

export function AdminSupportClient() {
  const { user } = useUser();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTickets = React.useCallback(async () => {
    const res = await getAllTicketsAction();
    if (res.success && res.tickets) {
      setTickets(res.tickets as SupportTicket[]);
      setSelectedTicket(prev => {
        if (!prev) return prev;
        const updated = (res.tickets as SupportTicket[]).find(t => t.id === prev.id);
        return updated || prev;
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user?.roles?.includes('Admin')) {
      loadTickets();
    }
  }, [user, loadTickets]);

  const handleReply = async () => {
    if (!replyMessage || !selectedTicket) return;
    setIsSubmitting(true);
    const res = await replyToTicketAction(selectedTicket.id, user!.id, user!.name, 'admin', replyMessage);
    if (res.success) {
      setReplyMessage("");
      toast({ title: "Reply Sent", description: "The user has been notified." });
      loadTickets();
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    setIsSubmitting(true);
    const res = await closeTicketAction(selectedTicket.id);
    if (res.success) {
      toast({ title: "Ticket Resolved", description: "This ticket has been closed." });
      loadTickets();
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (!user?.roles?.includes('Admin')) {
    return <div className="p-8 text-center text-red-500 font-bold uppercase">UNAUTHORIZED: Admin access required</div>;
  }

  const activeTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Support Inbox</h1>
        <p className="text-muted-foreground">Manage user support requests across the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-4">
             <h2 className="font-bold uppercase tracking-widest text-xs text-primary ml-2 flex items-center gap-2">
               <AlertCircle className="h-4 w-4" /> Action Required ({activeTickets.length})
             </h2>
             {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : activeTickets.length === 0 ? (
                <Card className="border-dashed bg-transparent shadow-none"><CardContent className="p-4 text-center text-muted-foreground text-sm">Inbox Zero! ??</CardContent></Card>
             ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {activeTickets.map(t => (
                    <Card 
                       key={t.id} 
                       className={`cursor-pointer transition-all hover:border-primary/50 ${selectedTicket?.id === t.id ? 'border-primary ring-1 ring-primary' : 'border-border/50'}`}
                       onClick={() => setSelectedTicket(t)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{t.status.replace('_', ' ')}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-bold text-sm line-clamp-1">{t.subject}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">{t.userName} ({t.category})</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
             )}
          </div>
          
          <div className="space-y-4 pt-6 border-t border-border/30">
             <h2 className="font-bold uppercase tracking-widest text-xs text-muted-foreground ml-2">Resolved ({resolvedTickets.length})</h2>
             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 opacity-70 hover:opacity-100 transition-opacity">
               {resolvedTickets.map(t => (
                 <Card 
                    key={t.id} 
                    className={`cursor-pointer transition-all hover:border-border ${selectedTicket?.id === t.id ? 'border-muted-foreground ring-1 ring-muted' : 'border-border/30 bg-muted/5'}`}
                    onClick={() => setSelectedTicket(t)}
                 >
                   <CardContent className="p-3">
                     <h3 className="font-bold text-sm line-clamp-1">{t.subject}</h3>
                     <p className="text-[10px] text-muted-foreground mt-1">{t.userName}</p>
                   </CardContent>
                 </Card>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="border-border/50 shadow-xl rounded-[2rem] h-[800px] flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-muted/10 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-black">{selectedTicket.subject}</CardTitle>
                    <CardDescription className="mt-1">From: {selectedTicket.userName} {selectedTicket.userEmail ? `<${selectedTicket.userEmail}>` : ''}</CardDescription>
                  </div>
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <Button onClick={handleResolve} disabled={isSubmitting} variant="outline" className="rounded-xl h-8 text-xs font-bold uppercase tracking-widest text-green-500 border-green-500/30 hover:bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Resolved
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-muted/5">
                {selectedTicket.replies.map((reply, i) => {
                  const isAdmin = reply.authorRole === 'admin';
                  return (
                    <div key={reply.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {isAdmin ? 'You (Admin)' : reply.authorName}
                          </span>
                       </div>
                       <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${isAdmin ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-background border border-border/50 rounded-tl-none'}`}>
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
                <div className="p-4 border-t border-border/30 bg-background shrink-0 space-y-3">
                  <Textarea 
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to the user..."
                    className="min-h-[100px] rounded-xl resize-none bg-muted/10"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleReply}
                      disabled={isSubmitting || !replyMessage.trim()}
                      className="rounded-xl px-8 font-black uppercase tracking-widest"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reply"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="h-[800px] rounded-[2rem] border border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
              <MessageSquare className="h-12 w-12 opacity-20 mb-4" />
              <p>Select a ticket from the inbox to review and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
