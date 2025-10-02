
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
import { AlertOctagon, Send, CheckCircle2, Bot, User as UserIcon, Shield } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dispute, DisputeMessage, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import Link from "next/link";
import { doc, getDoc, updateDoc, arrayUnion, collection, onSnapshot, DocumentData } from "firebase/firestore";
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

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [involvedUsers, setInvolvedUsers] = useState<{ [key: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const disputeRef = doc(db, 'disputes', id);
    const unsubscribe = onSnapshot(disputeRef, async (docSnap) => {
      if (docSnap.exists()) {
        const disputeData = { 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: toDate(docSnap.data().createdAt),
        } as Dispute;
        
        setDispute(disputeData);

        // Fetch user data if not already fetched
        const userIdsToFetch = [disputeData.parties.jobGiverId, disputeData.parties.installerId];
        const newUsers = { ...involvedUsers };
        let userFetched = false;
        for (const userId of userIdsToFetch) {
            if (!newUsers[userId]) {
                const userSnap = await getDoc(doc(db, 'users', userId));
                if (userSnap.exists()) {
                    newUsers[userId] = { id: userSnap.id, ...userSnap.data() } as User;
                    userFetched = true;
                }
            }
        }
        if (userFetched) {
            setInvolvedUsers(newUsers);
        }

      } else {
        setDispute(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);
  
  if (loading) {
    return <PageSkeleton />;
  }

  if (!dispute || !user) {
    notFound();
  }

  const isParty = user.id === dispute.parties.jobGiverId || user.id === dispute.parties.installerId || isAdmin;
  if (!isParty) {
    notFound();
  }

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;

    const message: DisputeMessage = {
        authorId: user.id,
        authorRole: isAdmin ? 'Admin' : (user.roles.includes('Job Giver') ? 'Job Giver' : 'Installer'),
        content: newMessage,
        timestamp: new Date(),
    };

    const disputeRef = doc(db, 'disputes', id);
    await updateDoc(disputeRef, {
        messages: arrayUnion(message)
    });
    setNewMessage("");
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
                  Regarding Job: <Link href={`/dashboard/jobs/${dispute.jobId}`} className="font-semibold hover:underline">{dispute.jobTitle}</Link>
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(dispute.status)} className="text-base">
                {dispute.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="font-semibold mb-2">Initial Complaint</h3>
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
                        <AvatarFallback>{message.authorRole.charAt(0)}</AvatarFallback>
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
                        <p className="text-sm mt-1 text-foreground bg-accent/30 p-3 rounded-lg">{message.content}</p>
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
                        <div className="mt-2 flex justify-end">
                            <Button onClick={handlePostMessage} disabled={!newMessage.trim()}>
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
              <span className="font-semibold">{format(dispute.createdAt, "MMM d, yyyy")}</span>
            </div>
            {dispute.resolvedAt && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved On</span>
                    <span className="font-semibold">{format(toDate(dispute.resolvedAt), "MMM d, yyyy")}</span>
                </div>
            )}
             <Separator />
            <div className="space-y-3">
                <h4 className="font-semibold">Parties Involved</h4>
                <Link href={`/dashboard/users/${dispute.parties.jobGiverId}`} className="block hover:bg-accent p-2 rounded-md">
                    <p className="font-medium">Job Giver</p>
                    <p className="text-xs text-muted-foreground font-mono">{dispute.parties.jobGiverId}</p>
                </Link>
                <Link href={`/dashboard/users/${dispute.parties.installerId}`} className="block hover:bg-accent p-2 rounded-md">
                    <p className="font-medium">Installer</p>
                    <p className="text-xs text-muted-foreground font-mono">{dispute.parties.installerId}</p>
                </Link>
            </div>
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
