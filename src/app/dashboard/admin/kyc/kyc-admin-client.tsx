"use client";

import React, { useEffect, useState } from 'react';
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useRouter } from "next/navigation";
import { USER_ROLES } from "@/lib/constants/statuses";
import { collection, query, where, getDocs } from "firebase/firestore";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminApproveKYCAction, adminRejectKYCAction } from '@/app/actions/user.actions';

export default function KycAdminClient() {
    const { user, loading: userLoading } = useUser();
    const { db } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (!userLoading && (!user || !user.roles?.includes(USER_ROLES.admin))) {
            router.push('/dashboard');
        }
    }, [user, userLoading, router]);

    const fetchPendingKYC = React.useCallback(async (showLoading = true) => {
        if (!db) return;
        if (showLoading) setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('kycStatus', '==', 'pending'));
            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            setPendingUsers(users);
        } catch (error) {
            console.error("Error fetching pending KYC users:", error);
            toast({
                title: "Error",
                description: "Failed to fetch pending KYC applications.",
                variant: "destructive"
            });
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [db, toast]);

    useEffect(() => {
        if (db && user?.roles?.includes(USER_ROLES.admin)) {
            fetchPendingKYC(false);
        }
    }, [db, user, fetchPendingKYC]);

    const handleApprove = async (userId: string) => {
        setActionLoading(userId);
        try {
            const result = await adminApproveKYCAction(userId);
            if (result.success) {
                toast({
                    title: "Approved",
                    description: "User KYC has been approved."
                });
                fetchPendingKYC();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to approve KYC",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (userId: string) => {
        setActionLoading(userId);
        try {
            const result = await adminRejectKYCAction(userId);
            if (result.success) {
                toast({
                    title: "Rejected",
                    description: "User KYC has been rejected."
                });
                fetchPendingKYC();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to reject KYC",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user || !user.roles?.includes(USER_ROLES.admin)) {
        return null;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">KYC Approvals</h2>
                <p className="text-muted-foreground">Manage pending KYC applications</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Applications</CardTitle>
                    <CardDescription>Users waiting for KYC verification.</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingUsers.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No pending KYC applications found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Documents</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map(u => (
                                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">
                                                {u.name || 'Unknown User'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {u.email}
                                            </td>
                                            <td className="px-4 py-3">
                                                {u.kycDocuments && u.kycDocuments.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {u.kycDocuments.map((docUrl: string, idx: number) => (
                                                            <a
                                                                key={idx}
                                                                href={docUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-primary hover:underline"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                Document {idx + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">No documents</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                                    disabled={actionLoading === u.id}
                                                    onClick={() => handleApprove(u.id!)}
                                                >
                                                    {actionLoading === u.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                                    disabled={actionLoading === u.id}
                                                    onClick={() => handleReject(u.id!)}
                                                >
                                                    {actionLoading === u.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                                                    Reject
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


