'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { requestWithdrawalAction } from '@/app/actions/wallet.actions';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

interface WalletClientProps {
    userId: string;
    initialBalance: number;
    initialWithdrawals: any[];
}

export function WalletClient({ userId, initialBalance, initialWithdrawals }: WalletClientProps) {
    const [balance, setBalance] = useState(initialBalance);
    const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    
    const { toast } = useToast();

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            toast({ title: "Invalid amount", description: "Please enter a valid amount to withdraw.", variant: "destructive" });
            return;
        }

        if (numAmount > balance) {
            toast({ title: "Insufficient funds", description: "You cannot withdraw more than your available balance.", variant: "destructive" });
            return;
        }

        if (!accountId) {
            toast({ title: "Select account", description: "Please select a bank account to withdraw to.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await requestWithdrawalAction(userId, numAmount, accountId);
            
            if (result.success && result.withdrawal) {
                toast({
                    title: "Success",
                    description: "Withdrawal request submitted successfully.",
                });
                
                // Update local state for immediate feedback
                setBalance(prev => prev - numAmount);
                setWithdrawals(prev => [result.withdrawal, ...prev]);
                setIsWithdrawOpen(false);
                setAmount('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to process withdrawal.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed':
            case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Balance Card */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                        <Wallet className="mr-2 h-4 w-4" />
                        Available Balance
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-end">
                    <div className="text-4xl font-bold">{formatCurrency(balance)}</div>
                    
                    <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                Withdraw
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Request Withdrawal</DialogTitle>
                                <DialogDescription>
                                    Transfer funds to your registered bank account.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <form onSubmit={handleWithdraw} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input 
                                        id="amount" 
                                        type="number" 
                                        placeholder="Enter amount to withdraw"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        max={balance}
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Available: {formatCurrency(balance)}
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="account">Bank Account</Label>
                                    <Select value={accountId} onValueChange={setAccountId} disabled={isSubmitting}>
                                        <SelectTrigger id="account" aria-label="Bank Account">
                                            <SelectValue placeholder="Select Bank Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="acc_sandbox_default">HDFC Bank (**** 1234)</SelectItem>
                                            <SelectItem value="acc_sandbox_alt">SBI (**** 9876)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsWithdrawOpen(false)} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting || !amount || !accountId}>
                                        {isSubmitting ? 'Processing...' : 'Submit'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>

            {/* Transactions History */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Withdrawals</CardTitle>
                    <CardDescription>Your past payout requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div data-testid="transaction-list" className="space-y-4">
                        {withdrawals.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                                No withdrawal history found.
                            </div>
                        ) : (
                            withdrawals.map((w) => (
                                <div key={w.id} className="flex items-center justify-between p-4 border rounded-md">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full bg-background border shadow-sm`}>
                                            {getStatusIcon(w.status)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Transfer to Bank (**** {w.accountId.includes('alt') ? '9876' : '1234'})</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(w.createdAt).toLocaleDateString()} at {new Date(w.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{formatCurrency(w.amount)}</p>
                                        <p className="text-xs capitalize text-muted-foreground">{w.status}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
