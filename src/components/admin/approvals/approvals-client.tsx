"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

interface PendingInstaller {
    id: string;
    name: string;
    email: string;
    mobile: string;
    installerProfile: {
        shopName?: string;
        experience?: string;
        skills?: string[];
        verificationStatus: 'pending' | 'verified' | 'rejected';
        submittedAt?: any;
        documents?: {
            aadharFront?: string;
            aadharBack?: string;
            panCard?: string;
            profilePhoto?: string;
        };
    };
}

export function ApprovalsClient() {
    const { user, isAdmin } = useUser();
    const [installers, setInstallers] = useState<PendingInstaller[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedInstaller, setSelectedInstaller] = useState<PendingInstaller | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const db = getFirestore();

    const fetchPendingInstallers = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("installerProfile.verificationStatus", "==", "pending")
                // Note: multiple inequality filters or order by might require index
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingInstaller));
            // Sort client side to avoid index requirement for now
            data.sort((a, b) => (b.installerProfile.submittedAt?.seconds || 0) - (a.installerProfile.submittedAt?.seconds || 0));

            setInstallers(data);
        } catch (error) {
            console.error("Error fetching installers:", error);
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        if (isAdmin) {
            fetchPendingInstallers();
        }
    }, [isAdmin, fetchPendingInstallers]);

    const handleDecision = async (status: 'verified' | 'rejected') => {
        if (!selectedInstaller) return;
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "users", selectedInstaller.id), {
                "installerProfile.verificationStatus": status,
                "installerProfile.verified": status === 'verified',
                "installerProfile.verificationDate": Timestamp.now(),
                "roles": status === 'verified' ? [...(user?.roles || []), 'Installer'] : user?.roles // Ensure they have the role if verified
            });

            toast({
                title: status === 'verified' ? "Installer Approved" : "Installer Rejected",
                description: `Successfully updated status for ${selectedInstaller.name}`,
            });

            fetchPendingInstallers();
            setSelectedInstaller(null);

        } catch (error) {
            console.error("Error updating status:", error);
            toast({
                title: "Update Failed",
                description: "Could not update installer status.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredInstallers = installers.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) return <div className="p-8">Access Denied</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
                <p className="text-muted-foreground">Review and approve new installer applications.</p>
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Button variant="outline" onClick={fetchPendingInstallers}>Refresh</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Shop / Experience</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredInstallers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No pending approvals found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInstallers.map((installer) => (
                                    <TableRow key={installer.id}>
                                        <TableCell>
                                            <div className="font-medium">{installer.name}</div>
                                            <div className="text-xs text-muted-foreground">{installer.email}</div>
                                            <div className="text-xs text-muted-foreground">{installer.mobile}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{installer.installerProfile.shopName || "N/A"}</div>
                                            <div className="text-xs text-muted-foreground">{installer.installerProfile.experience} Years • {installer.installerProfile.skills?.length} Skills</div>
                                        </TableCell>
                                        <TableCell>
                                            {installer.installerProfile.submittedAt ? format(new Date(installer.installerProfile.submittedAt.seconds * 1000), "PP p") : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" onClick={() => setSelectedInstaller(installer)}>Review</Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Review Application: {installer.name}</DialogTitle>
                                                        <DialogDescription>Review documents and approve or reject.</DialogDescription>
                                                    </DialogHeader>

                                                    <div className="grid grid-cols-2 gap-4 py-4">
                                                        <div className="col-span-2 md:col-span-1 space-y-3">
                                                            <h3 className="font-semibold border-b pb-1">Profile Details</h3>
                                                            <div className="text-sm space-y-1">
                                                                <p><span className="text-muted-foreground">Experience:</span> {installer.installerProfile.experience} Years</p>
                                                                <p><span className="text-muted-foreground">Skills:</span> {installer.installerProfile.skills?.join(", ")}</p>
                                                                <p><span className="text-muted-foreground">Shop:</span> {installer.installerProfile.shopName}</p>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2 space-y-3">
                                                            <h3 className="font-semibold border-b pb-1">Documents</h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {installer.installerProfile.documents?.aadharFront && (
                                                                    <a href={installer.installerProfile.documents.aadharFront} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-muted/50 text-center text-sm">
                                                                        <ExternalLink className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                                                                        View Aadhar Front
                                                                    </a>
                                                                )}
                                                                {installer.installerProfile.documents?.aadharBack && (
                                                                    <a href={installer.installerProfile.documents.aadharBack} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-muted/50 text-center text-sm">
                                                                        <ExternalLink className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                                                                        View Aadhar Back
                                                                    </a>
                                                                )}
                                                                {installer.installerProfile.documents?.panCard && (
                                                                    <a href={installer.installerProfile.documents.panCard} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-muted/50 text-center text-sm">
                                                                        <ExternalLink className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                                                                        View PAN Card
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <DialogFooter className="flex gap-2 justify-end">
                                                        <Button variant="destructive" onClick={() => handleDecision('rejected')} disabled={isProcessing}>
                                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                                            Reject
                                                        </Button>
                                                        <Button onClick={() => handleDecision('verified')} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                            Approve & Verify
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
