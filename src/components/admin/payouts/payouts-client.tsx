"use client";
import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function PayoutsClient() {
    const { db, auth } = useFirebase();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadPendingPayouts = async () => {
        if (!db) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'transactions'),
                where('status', '==', 'payout_pending')
            );
            const snap = await getDocs(q);
            const txs = await Promise.all(snap.docs.map(async (d) => {
                const data = d.data();
                let payeeName = 'Unknown';
                let beneficiary = null;
                if (data.payeeId) {
                    const userSnap = await getDoc(doc(db, 'users', data.payeeId));
                    if (userSnap.exists()) {
                        payeeName = userSnap.data().name;
                        beneficiary = userSnap.data().payouts;
                    }
                }
                return { id: d.id, ...data, payeeName, beneficiary };
            }));
            
            // Sort client side
            txs.sort((a, b) => (b.resolvedAt?.seconds || 0) - (a.resolvedAt?.seconds || 0));
            setTransactions(txs);
        } catch (error) {
            console.error('Error loading payouts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPendingPayouts();
    }, [db]);

    const handleMarkPaid = async (tx: any) => {
        if (!confirm('Have you manually transferred this money? This cannot be undone.')) return;
        
        setProcessingId(tx.id);
        try {
            const token = await auth?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/payouts/mark-paid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ transactionId: tx.id })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to mark as paid');
            
            toast({ title: 'Success', description: 'Payout marked as paid manually.' });
            loadPendingPayouts();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Pending Manual Payouts</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Transactions Awaiting Transfer</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : transactions.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No pending payouts right now!</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payee / Professional</TableHead>
                                    <TableHead>Job Amount</TableHead>
                                    <TableHead>Bank Details</TableHead>
                                    <TableHead>Date Pending</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <div className="font-medium">{tx.payeeName}</div>
                                            <div className="text-xs text-muted-foreground">TX: {tx.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-green-600">₹{tx.amount}</div>
                                        </TableCell>
                                        <TableCell>
                                            {tx.beneficiary?.accountNumber ? (
                                                <div className="text-sm">
                                                    <div>Acct: {tx.beneficiary.accountNumber}</div>
                                                    <div>IFSC: {tx.beneficiary.ifsc}</div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-red-500">No Bank Details found</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tx.resolvedAt ? format(new Date(tx.resolvedAt.seconds * 1000), 'PPp') : 'Unknown'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleMarkPaid(tx)}
                                                disabled={processingId === tx.id}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {processingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                Mark Paid
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
