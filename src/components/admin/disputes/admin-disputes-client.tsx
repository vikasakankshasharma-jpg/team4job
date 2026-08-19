"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { listAllDisputesAction } from "@/app/actions/dispute.actions";
import { Dispute } from "@/domains/disputes/dispute.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { toDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { auth } from "@/infrastructure/firebase/client";
import axios from "axios";
import { Textarea } from "@/components/ui/textarea";

export function AdminDisputesClient() {
    const { user, loading: userLoading } = useUser();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Dialog State
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");

    const fetchDisputes = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await listAllDisputesAction(user.id);
            if (res.success && res.disputes) {
                setDisputes(res.disputes as Dispute[]);
            } else {
                throw new Error(res.error || "Failed to fetch disputes");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userLoading && user) {
            fetchDisputes();
        }
    }, [user, userLoading]);

    const handleResolve = async (resolution: 'REFUND' | 'RELEASE' | 'SPLIT') => {
        if (!selectedDispute || !selectedDispute.jobId) return;

        setResolving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await axios.post('/api/escrow/resolve-dispute', {
                jobId: selectedDispute.jobId,
                disputeId: selectedDispute.id,
                resolution,
                adminNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast({ title: "Success", description: `Dispute resolved with status: ${resolution}` });
                setIsResolveDialogOpen(false);
                setSelectedDispute(null);
                setAdminNotes("");
                fetchDisputes(); // Refresh
            } else {
                throw new Error(res.data.error || "Failed to resolve");
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message;
            toast({ title: "Resolution Failed", description: msg, variant: "destructive" });
        } finally {
            setResolving(false);
        }
    };

    if (userLoading || loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Dispute Resolution</h1>
                <p className="text-muted-foreground">Manage and resolve active disputes.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Disputes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Job Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {disputes.map((dispute) => (
                                <TableRow key={dispute.id}>
                                    <TableCell>{format(toDate(dispute.createdAt as any), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="font-medium">{dispute.jobTitle || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={dispute.status === 'Resolved' ? 'secondary' : 'destructive'}>
                                            {dispute.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{dispute.reason}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedDispute(dispute);
                                                setIsResolveDialogOpen(true);
                                            }}
                                        >
                                            View & Resolve
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {disputes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No disputes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Resolve Dialog */}
            <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Resolve Dispute</DialogTitle>
                        <DialogDescription>
                            Review the dispute details and settle the escrow funds.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDispute && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold">Job Title</p>
                                    <p className="text-sm text-muted-foreground">{selectedDispute.jobTitle}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Status</p>
                                    <Badge variant={selectedDispute.status === 'Resolved' ? 'secondary' : 'destructive'}>
                                        {selectedDispute.status}
                                    </Badge>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-semibold">Reason</p>
                                    <p className="text-sm text-muted-foreground">{selectedDispute.reason}</p>
                                </div>
                            </div>

                            <div className="border rounded-md p-4 bg-muted/20">
                                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Message History
                                </p>
                                <div className="space-y-4 max-h-60 overflow-y-auto">
                                    {selectedDispute.messages.map((msg, i) => (
                                        <div key={i} className="text-sm">
                                            <span className="font-semibold text-primary">{msg.authorRole}:</span>{" "}
                                            <span className="text-muted-foreground">{msg.content}</span>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mt-2 flex gap-2">
                                                    {msg.attachments.map((att: any, j: number) => (
                                                        <a key={j} href={att.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                                                            View Attachment
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedDispute.status !== 'Resolved' && (
                                <div className="space-y-2 mt-4">
                                    <p className="text-sm font-semibold">Admin Resolution Notes (Optional)</p>
                                    <Textarea
                                        placeholder="Add any notes about this resolution..."
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        className="resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        {selectedDispute?.status !== 'Resolved' && (
                            <>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => handleResolve('REFUND')}
                                    disabled={resolving}
                                >
                                    {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refund Client"}
                                </Button>
                                <Button 
                                    variant="default" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleResolve('RELEASE')}
                                    disabled={resolving}
                                >
                                    {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Release to Pro"}
                                </Button>
                            </>
                        )}
                        {selectedDispute?.status === 'Resolved' && (
                            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
