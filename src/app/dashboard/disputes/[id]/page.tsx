
"use client";

import { useUser } from "@/hooks/use-user";
import { notFound, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertOctagon, Send, CheckCircle2, Bot, User as UserIcon, Shield, Paperclip, X, File as FileIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dispute, DisputeMessage, User, DisputeAttachment } from "@/lib/types";
import { toDate } from "@/lib/utils";
import Link from "next/link";
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";

const getStatusVariant = (status: Dispute['status']) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Under Review': return 'warning';
    case 'Resolved': return 'success';
    default: return 'default';
  }
};

const getRoleIcon = (role: DisputeMessage['authorRole']) => {
    switch(role) {
        case 'Admin': return <Shield className="h-4 w-4" />;
        case 'Job Giver': return <UserIcon className="h-4 w-4" />;
        case 'Installer': return <UserIcon className="h-4 w-4" />;
        default: return <Bot className="h-4 w-4" />;
    }
}

function PageSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DisputeDetailPage() {
  const { user, isAdmin } = useUser();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const userCache = useRef<{ [key: string]: User }>({});

  const getUser = useCallback(async (userId: string): Promise<User | null> => {
    if (userCache.current[userId]) return userCache.current[userId];
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
        const userData = { id: userSnap.id, ...userSnap.data() } as User;
        userCache.current[userId] = userData;
        return userData;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const disputeRef = doc(db, 'disputes', id);
    const unsubscribe = onSnapshot(disputeRef, async (docSnap) => {
      if (docSnap.exists()) {
        const disputeData = { id: docSnap.id, ...docSnap.data() } as Dispute;
        
        const allUserIds = new Set([
            disputeData.requesterId,
            ...(disputeData.parties ? [disputeData.parties.jobGiverId, disputeData.parties.installerId] : []),
            ...disputeData.messages.map(m => m.authorId)
        ].filter(Boolean));

        for (const userId of Array.from(allUserIds)) {
            await getUser(userId);
        }

        setDispute(disputeData);
      } else {
        setDispute(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, getUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const removeAttachment = (fileName: string) => {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
  };
  
  if (loading) {
    return <PageSkeleton />;
  }

  if (!dispute || !user) {
    notFound();
  }

  const isParty = user.id === dispute.requesterId || (dispute.parties && (user.id === dispute.parties.jobGiverId || user.id === dispute.parties.installerId)) || isAdmin;
  if (!isParty) {
    notFound();
  }

  const handlePostMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    // Mock upload process
    const uploadedAttachments: DisputeAttachment[] = attachments.map(file => ({
        fileName: file.name,
        fileUrl: `#`, // In real app, this would be the URL from Firebase Storage
        fileType: file.type,
    }));

    const message: DisputeMessage = {
        authorId: user.id,
        authorRole: isAdmin ? 'Admin' : (user.roles.includes('Job Giver') ? 'Job Giver' : 'Installer'),
        content: newMessage,
        timestamp: new Date(),
        attachments: uploadedAttachments,
    };

    const disputeRef = doc(db, 'disputes', id);
    await updateDoc(disputeRef, {
        messages: arrayUnion(message)
    });

    setNewMessage("");
    setAttachments([]);
  };
  
  const handleResolveDispute = async () => {
     const disputeRef = doc(db, 'disputes', id);
     await updateDoc(disputeRef, {
        status: 'Resolved',
        resolvedAt: new Date()
    });
    toast({ title: "Dispute Resolved", description: "This case is now closed." });
  }

  const handleReviewDispute = async () => {
     const disputeRef = doc(db, 'disputes', id);
     await updateDoc(disputeRef, {
        status: 'Under Review',
    });
    toast({ title: "Dispute Under Review", description: "You are now actively reviewing this case." });
  }
  
  const involvedUsers = userCache.current;

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <AlertOctagon className="h-6 w-6" />
                  Dispute Ticket #{dispute.id.slice(-6).toUpperCase()}
                </CardTitle>
                <CardDescription className="mt-2">
                  {dispute.jobId ? (
                    <>Regarding Job: <Link href={`/dashboard/jobs/${dispute.jobId}`} className="font-semibold hover:underline">{dispute.jobTitle}</Link></>
                  ) : (
                    `Category: ${dispute.category}`
                  )}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(dispute.status)} className="text-base">
                {dispute.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="font-semibold mb-2">Initial Complaint: {dispute.title}</h3>
              <blockquote className="border-l-4 pl-4 italic text-muted-foreground">
                {dispute.reason}
              </blockquote>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4">Discussion Thread</h3>
              <div className="space-y-6">
                {dispute.messages.map((message, index) => {
                  const author = involvedUsers[message.authorId];
                  const timeAgo = formatDistanceToNow(toDate(message.timestamp), { addSuffix: true });
                  return (
                    <div key={index} className="flex gap-3">
                      <Avatar className="h-9 w-9">
                        {author && <AnimatedAvatar svg={author.avatarUrl} />}
                        <AvatarFallback>{author ? author.name.charAt(0) : '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-sm">
                            <p className="font-semibold">{author?.name || message.authorId}</p>
                            <Badge variant="outline" className="gap-1.5 font-normal">
                                {getRoleIcon(message.authorRole)}
                                {message.authorRole}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                        <div className="text-sm mt-1 text-foreground bg-accent/30 p-3 rounded-lg space-y-3">
                           {message.content && <p>{message.content}</p>}
                           {message.attachments && message.attachments.length > 0 && (
                             <div>
                               <p className="font-semibold text-xs mb-2">Attachments:</p>
                               <div className="space-y-2">
                                  {message.attachments.map((file, fileIdx) => (
                                    <a 
                                      key={fileIdx} 
                                      href={file.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="flex items-center gap-2 text-primary hover:underline bg-primary/10 p-2 rounded-md text-xs"
                                    >
                                      <FileIcon className="h-4 w-4" />
                                      <span>{file.fileName}</span>
                                    </a>
                                  ))}
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          {dispute.status !== 'Resolved' && (
            <CardFooter className="flex flex-col items-start gap-4 border-t pt-6">
                <h3 className="font-semibold">Post a Reply</h3>
                <div className="w-full flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                        <AnimatedAvatar svg={user.avatarUrl} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <Textarea
                            placeholder="Type your message here..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={4}
                        />
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            className="hidden"
                        />
                         {attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                                <p className="text-xs font-semibold">Selected Files:</p>
                                {attachments.map(file => (
                                    <div key={file.name} className="flex items-center justify-between text-xs bg-muted p-2 rounded-md">
                                        <span>{file.name}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(file.name)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-2 flex justify-between">
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <Paperclip className="mr-2 h-4 w-4" />
                                Attach Files
                            </Button>
                            <Button onClick={handlePostMessage} disabled={!newMessage.trim() && attachments.length === 0}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Message
                            </Button>
                        </div>
                    </div>
                </div>
            </CardFooter>
          )}
        </Card>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
             <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold">{dispute.status}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Raised On</span>
              <span className="font-semibold">{format(toDate(dispute.createdAt), "MMM d, yyyy")}</span>
            </div>
            {dispute.resolvedAt && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved On</span>
                    <span className="font-semibold">{format(toDate(dispute.resolvedAt), "MMM d, yyyy")}</span>
                </div>
            )}
             <Separator />
             <div className="space-y-3">
                 <h4 className="font-semibold">Requester</h4>
                <Link href={`/dashboard/users/${dispute.requesterId}`} className="block hover:bg-accent p-2 rounded-md">
                    <p className="font-medium">{involvedUsers[dispute.requesterId]?.name || 'Loading...'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{dispute.requesterId}</p>
                </Link>
             </div>
            {dispute.parties && (
                 <div className="space-y-3">
                    <h4 className="font-semibold">Parties Involved</h4>
                    <Link href={`/dashboard/users/${dispute.parties.jobGiverId}`} className="block hover:bg-accent p-2 rounded-md">
                        <p className="font-medium">Job Giver: {involvedUsers[dispute.parties.jobGiverId]?.name || '...'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{dispute.parties.jobGiverId}</p>
                    </Link>
                    <Link href={`/dashboard/users/${dispute.parties.installerId}`} className="block hover:bg-accent p-2 rounded-md">
                        <p className="font-medium">Installer: {involvedUsers[dispute.parties.installerId]?.name || '...'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{dispute.parties.installerId}</p>
                    </Link>
                </div>
            )}
          </CardContent>
          {isAdmin && dispute.status !== 'Resolved' && (
             <>
              <Separator />
              <CardContent className="pt-6">
                <div className="space-y-2">
                    {dispute.status === 'Open' && (
                        <Button onClick={handleReviewDispute} className="w-full">Mark as Under Review</Button>
                    )}
                    {dispute.status === 'Under Review' && (
                        <Button onClick={handleResolveDispute} variant="success" className="w-full">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Resolve Dispute
                        </Button>
                    )}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
