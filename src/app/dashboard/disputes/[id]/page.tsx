
"use client";

import { useUser, useFirebase } from "@/hooks/use-user";
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
import { AlertOctagon, Send, CheckCircle2, Bot, User as UserIcon, Shield, RefreshCw, Undo2, File as FileIcon, Award } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dispute, DisputeMessage, User, Transaction } from "@/lib/types";
import { toDate } from "@/lib/utils";
import Link from "next/link";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { doc, getDoc, updateDoc, arrayUnion, query, collection, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useHelp } from "@/hooks/use-help";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import axios from 'axios';
import { FileUpload } from "@/components/ui/file-upload";

const getStatusVariant = (status: Dispute['status']) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Under Review': return 'warning';
    case 'Resolved': return 'success';
    default: return 'default';
  }
};

const getRoleIcon = (role: DisputeMessage['authorRole']) => {
  switch (role) {
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
  const { user, role, isAdmin, loading: userLoading } = useUser();
  const { db, storage, auth } = useFirebase();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { setHelp } = useHelp();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [involvedUsers, setInvolvedUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  React.useEffect(() => {
    setHelp({
      title: "Dispute Details",
      content: (
        <div className="space-y-4 text-sm">
          <p>This page shows the complete history of a single dispute ticket. All parties involved can communicate here.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Discussion Thread:</span> View all messages and evidence.</li>
            <li><span className="font-semibold">Post a Reply:</span> Use the text box and file uploader to add your response.</li>
            <li><span className="font-semibold">Admin Actions:</span> Admins can change the status or process refunds and payouts.</li>
          </ul>
        </div>
      )
    })
  }, [setHelp]);

  useEffect(() => {
    if (!id || !db) return;
    async function fetchDisputeAndTransaction() {
      setLoading(true);
      const disputeRef = doc(db, "disputes", id);
      const disputeSnap = await getDoc(disputeRef);

      if (!disputeSnap.exists()) {
        setDispute(null);
        setLoading(false);
        return;
      }

      const disputeData = disputeSnap.data() as Dispute;

      if (disputeData.jobId) {
        const transQuery = query(collection(db, "transactions"), where("jobId", "==", disputeData.jobId));
        const transSnap = await getDocs(transQuery);
        if (!transSnap.empty) {
          setTransaction(transSnap.docs[0].data() as Transaction);
        }
      }

      const userIds = new Set<string>([disputeData.requesterId]);
      if (disputeData.parties) {
        userIds.add(disputeData.parties.jobGiverId);
        userIds.add(disputeData.parties.installerId);
      }
      if (disputeData.handledBy) {
        userIds.add(disputeData.handledBy);
      }
      disputeData.messages.forEach(msg => userIds.add(msg.authorId));

      const userDocs = await Promise.all(Array.from(userIds).map(uid => getDoc(doc(db, "users", uid))));
      const usersMap = userDocs.reduce((acc, userDoc) => {
        if (userDoc.exists()) {
          acc[userDoc.id] = userDoc.data() as User;
        }
        return acc;
      }, {} as Record<string, User>);

      setInvolvedUsers(usersMap);
      setDispute(disputeData);
      setLoading(false);
    }
    fetchDisputeAndTransaction();
  }, [id, db]);

  if (loading || userLoading) {
    return <PageSkeleton />;
  }

  if (!dispute || !user || !storage) {
    notFound();
  }

  const isParty = user.id === dispute.requesterId || (dispute.parties && (user.id === dispute.parties.jobGiverId || user.id === dispute.parties.installerId)) || isAdmin || role === 'Support Team';
  if (!isParty) {
    notFound();
  }

  const handleUpdateDispute = async (updateData: Partial<Dispute>) => {
    const disputeRef = doc(db, "disputes", id);
    await updateDoc(disputeRef, updateData);
    setDispute(prev => prev ? { ...prev, ...updateData } : null);
  }

  const handlePostMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || isSubmitting) return;
    setIsSubmitting(true);

    let attachmentUrls: { fileName: string; fileUrl: string; fileType: string; }[] = [];

    if (attachments.length > 0) {
      const uploadPromises = attachments.map(async (file) => {
        const storageRef = ref(storage, `disputes/${id}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
      });
      attachmentUrls = await Promise.all(uploadPromises);
    }

    const message: DisputeMessage = {
      authorId: user.id,
      authorRole: role,
      content: newMessage,
      timestamp: new Date(),
      attachments: attachmentUrls,
    };

    await updateDoc(doc(db, "disputes", id), {
      messages: arrayUnion(message)
    });
    setDispute(prev => prev ? { ...prev, messages: [...prev.messages, message] } : null);

    setNewMessage("");
    setAttachments([]);
    setIsSubmitting(false);
  };

  const handleResolveDispute = async () => {
    await handleUpdateDispute({ status: 'Resolved', resolvedAt: new Date() });
    toast({ title: "Dispute Resolved", description: "This case is now closed." });
  }

  const handleReviewDispute = async () => {
    await handleUpdateDispute({ status: 'Under Review', handledBy: user.id });
    toast({ title: "Dispute Under Review", description: "The case is now marked for active review." });
  }

  const handleRefund = async () => {
    if (!transaction) return toast({ title: "Transaction not found", variant: "destructive" });
    setIsRefunding(true);
    try {
      // Get the current user's ID token to pass as Bearer token provided we are admin.
      // But this is client-side code. 'axios' calls on client side send cookies usually if configured, 
      // but here we need to send the Authorization header explicitly because our API route validates 'Bearer <token>'.

      const token = await auth?.currentUser?.getIdToken();

      await axios.post('/api/cashfree/payouts/request-transfer', {
        transactionId: transaction.id,
        userId: transaction.payerId, // The user to refund is the payer (Job Giver)
        transferType: 'refund',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "Refund Initiated", description: "The refund to the Job Giver has been processed." });
      setTransaction(prev => prev ? { ...prev, status: 'refunded' } : null);
    } catch (error: any) {
      toast({ title: "Refund Failed", description: error.response?.data?.error || "Could not process refund.", variant: "destructive" });
    } finally {
      setIsRefunding(false);
    }
  };



  const handleWithdrawDispute = async () => {
    if (!confirm("Are you sure you want to withdraw this dispute? This will close the ticket.")) return;
    await handleUpdateDispute({
      status: 'Resolved',
      resolvedAt: new Date(),
      resolution: 'Withdrawn by Requester'
    });
    toast({ title: "Dispute Withdrawn", description: "The ticket has been closed." });
  };

  const handleReleaseFunds = async () => {
    if (!transaction) return toast({ title: "Transaction not found", variant: "destructive" });
    setIsReleasing(true);
    try {
      // Admin Force Release
      // We should use resolve-dispute for this, logic handles payouts.
      // But if explicit release needed:
      await axios.post('/api/escrow/resolve-dispute', {
        disputeId: dispute.id,
        resolutionType: 'Payout',
        splitPercentage: 100, // Full Payout
        adminNotes: 'Manual Admin Release'
      });
      toast({ title: "Funds Released", description: "The payment has been released to the installer.", variant: "default" });
      setTransaction(prev => prev ? { ...prev, status: 'released' } : null);
    } catch (error: any) {
      toast({ title: "Release Failed", description: error.response?.data?.error || "Could not release funds.", variant: "destructive" });
    } finally {
      setIsReleasing(false);
    }
  };



  const handleFreezePayment = async () => {
    if (!transaction) return;
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "transactions", transaction.id), { status: 'disputed' });
      setTransaction(prev => prev ? { ...prev, status: 'disputed' } : null);
      toast({ title: "Payment Frozen", description: "Escrow funds are now locked until dispute resolution." });
    } catch (error) {
      toast({ title: "Operation Failed", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUnfreezePayment = async () => {
    if (!transaction) return;
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "transactions", transaction.id), { status: 'funded' });
      setTransaction(prev => prev ? { ...prev, status: 'funded' } : null);
      toast({ title: "Payment Unfrozen", description: "Funds returned to active Escrow state." });
    } catch (error) {
      toast({ title: "Operation Failed", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };



  const isTeamMember = isAdmin || role === 'Support Team';

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <AlertOctagon className="h-6 w-6" />
                  Dispute Ticket #{id.slice(-6).toUpperCase()}
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
                <div className="flex-1 space-y-4">
                  <Textarea
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={4}
                  />
                  <FileUpload
                    onFilesChange={setAttachments}
                    maxFiles={5}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handlePostMessage} disabled={(!newMessage.trim() && attachments.length === 0) || isSubmitting}>
                      {isSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
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
            {dispute.handledBy && involvedUsers[dispute.handledBy] && (
              <div className="space-y-3">
                <h4 className="font-semibold">Handler</h4>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AnimatedAvatar svg={involvedUsers[dispute.handledBy]?.avatarUrl} />
                    <AvatarFallback>{involvedUsers[dispute.handledBy]?.name.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{involvedUsers[dispute.handledBy]?.name}</p>
                    <p className="text-xs text-muted-foreground">Support Team</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <h4 className="font-semibold">Requester</h4>
              <Link href={`/dashboard/users/${dispute.requesterId}`} className="block hover:bg-accent p-2 rounded-md">
                <p className="font-medium">{involvedUsers[dispute.requesterId]?.name || '...'}</p>
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
          {isTeamMember && dispute.status !== 'Resolved' && (
            <>
              <Separator />
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {dispute.status === 'Open' && (
                    <Button onClick={handleReviewDispute} className="w-full">Mark as Under Review</Button>
                  )}
                  {dispute.status === 'Under Review' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="success" className="w-full">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Resolve Dispute
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolve Dispute & Close Job</DialogTitle>
                          <DialogDescription>
                            Decide the final outcome for this job. This action is irreversible.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Button variant="destructive" onClick={async () => {
                            // Option A: Cancel Job (Refund Giver)
                            // Logic: 1. Refund logic (if funded). 2. Job status -> Cancelled. 3. Dispute -> Resolved.
                            if (transaction?.status === 'funded') {
                              await handleRefund();
                            }
                            await handleUpdateDispute({ status: 'Resolved', resolvedAt: new Date(), resolution: 'Job Cancelled & Refunded' });
                            // We also need to update the Job Status here ideally, but we don't have direct handleJobUpdate prop here.
                            // We can assume the API/Backend flows or we do a direct db update if permission allows.
                            // For this MVP, we will rely on the Refunds triggering job updates or manual cleanup, 
                            // BUT the plan said to update Job Status. 
                            // Let's at least mark the dispute clearly.
                            // NOTE: Ideally we should update the Job doc too.
                            if (dispute.jobId) {
                              await updateDoc(doc(db, "jobs", dispute.jobId), { status: 'Cancelled' });
                            }
                            toast({ title: "Resolved", description: "Job Cancelled and Dispute Resolved." });
                          }}>
                            Option A: Cancel Job & Refund Giver
                          </Button>
                          <Button className="bg-green-600 hover:bg-green-700" onClick={async () => {
                            // Option B: Complete Job (Pay Installer)
                            if (transaction?.status === 'funded') {
                              await handleReleaseFunds();
                            }
                            await handleUpdateDispute({ status: 'Resolved', resolvedAt: new Date(), resolution: 'Job Completed & Funds Released' });
                            if (dispute.jobId) {
                              await updateDoc(doc(db, "jobs", dispute.jobId), { status: 'Completed' });
                            }
                            toast({ title: "Resolved", description: "Job Completed and Funds Released." });
                          }}>
                            Option B: Complete Job & Pay Installer
                          </Button>
                          <Button variant="secondary" onClick={async () => {
                            // Option C: Just Close Ticket
                            await handleResolveDispute();
                          }}>
                            Option C: Just Close Ticket (No Job Action)
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {isAdmin && (transaction?.status === 'funded' || transaction?.status === 'disputed') && (
                    <>
                      {transaction.status === 'funded' ? (
                        <Button variant="outline" className="w-full text-orange-600 border-orange-600" onClick={handleFreezePayment} disabled={isUpdatingStatus}>
                          <Shield className="mr-2 h-4 w-4" />
                          Freeze Payment (Lock Escrow)
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full text-blue-600 border-blue-600" onClick={handleUnfreezePayment} disabled={isUpdatingStatus}>
                          <Shield className="mr-2 h-4 w-4" />
                          Unfreeze Payment
                        </Button>
                      )}

                      <Button variant="destructive" className="w-full" onClick={handleRefund} disabled={isRefunding || isReleasing || transaction.status === 'disputed'}>
                        {isRefunding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                        Refund to Job Giver
                      </Button>
                      <Button variant="success" className="w-full" onClick={handleReleaseFunds} disabled={isReleasing || isRefunding || transaction.status === 'disputed'}>
                        {isReleasing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                        Release Funds to Installer
                      </Button>
                    </>
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
