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
import { db } from "@/infrastructure/firebase/client";
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

interface PendingProfessional {
    id: string;
    name: string;
    email: string;
    mobile: string;
    professionalProfile: {
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
    const [Professionals, setProfessionals] = useState<PendingProfessional[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProfessional, setSelectedProfessional] = useState<PendingProfessional | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const fetchPendingProfessionals = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("professionalProfile.verificationStatus", "==", "pending")
                // Note: multiple inequality filters or order by might require index
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingProfessional));
            // Sort client side to avoid index requirement for now
            data.sort((a, b) => (b.professionalProfile.submittedAt?.seconds || 0) - (a.professionalProfile.submittedAt?.seconds || 0));

            setProfessionals(data);
        } catch (error) {
            // Error fetching Professionals
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchPendingProfessionals();
        }
    }, [isAdmin, fetchPendingProfessionals]);

    const handleDecision = async (status: 'verified' | 'rejected') => {
        if (!selectedProfessional) return;
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "users", selectedProfessional.id), {
                "professionalProfile.verificationStatus": status,
                "professionalProfile.verified": status === 'verified',
                "professionalProfile.verificationDate": Timestamp.now(),
                "roles": status === 'verified' ? [...(user?.roles || []), 'Professional'] : user?.roles // Ensure they have the role if verified
            });

            toast({
                title: status === 'verified' ? "Professional Approved" : "Professional Rejected",
                description: `Successfully updated status for ${selectedProfessional.name}`,
            });

            fetchPendingProfessionals();
            setSelectedProfessional(null);

        } catch (error) {
            toast({
                title: "Update Failed",
                description: "Could not update Professional status.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProfessionals = Professionals.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) return <div className="p-8">Access Denied</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
                <p className="text-muted-foreground">Review and approve new Professional applications.</p>
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Button variant="outline" onClick={fetchPendingProfessionals}>Refresh</Button>
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
                            ) : filteredProfessionals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No pending approvals found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProfessionals.map((Professional) => (
                                    <TableRow key={Professional.id}>
                                        <TableCell>
                                            <div className="font-medium">{Professional.name}</div>
                                            <div className="text-xs text-muted-foreground">{Professional.email}</div>
                                            <div className="text-xs text-muted-foreground">{Professional.mobile}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{Professional.professionalProfile.shopName || "N/A"}</div>
                                            <div className="text-xs text-muted-foreground">{Professional.professionalProfile.experience} Years • {Professional.professionalProfile.skills?.length} Skills</div>
                                        </TableCell>
                                        <TableCell>
                                            {Professional.professionalProfile.submittedAt ? format(new Date(Professional.professionalProfile.submittedAt.seconds * 1000), "PP p") : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" onClick={() => setSelectedProfessional(Professional)}>Review</Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Review Application: {Professional.name}</DialogTitle>
                                                        <DialogDescription>Review documents and approve or reject.</DialogDescription>
                                                    </DialogHeader>

                                                    <div className="grid grid-cols-2 gap-4 py-4">
                                                        <div className="col-span-2 md:col-span-1 space-y-3">
                                                            <h3 className="font-semibold border-b pb-1">Profile Details</h3>
                                                            <div className="text-sm space-y-1">
                                                                <p><span className="text-muted-foreground">Experience:</span> {Professional.professionalProfile.experience} Years</p>
                                                                <p><span className="text-muted-foreground">Skills:</span> {Professional.professionalProfile.skills?.join(", ")}</p>
                                                                <p><span className="text-muted-foreground">Shop:</span> {Professional.professionalProfile.shopName}</p>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2 space-y-3">
                                                            <h3 className="font-semibold border-b pb-1">Documents</h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {Professional.professionalProfile.documents?.aadharFront && (
                                                                    <a href={Professional.professionalProfile.documents.aadharFront} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-muted/50 text-center text-sm">
                                                                        <ExternalLink className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                                                                        View Aadhar Front
                                                                    </a>
                                                                )}
                                                                {Professional.professionalProfile.documents?.aadharBack && (
                                                                    <a href={Professional.professionalProfile.documents.aadharBack} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-muted/50 text-center text-sm">
                                                                        <ExternalLink className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                                                                        View Aadhar Back
                                                                    </a>
                                                                )}
                                                                {Professional.professionalProfile.documents?.panCard && (
                                                                    <a href={Professional.professionalProfile.documents.panCard} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-muted/50 text-center text-sm">
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
