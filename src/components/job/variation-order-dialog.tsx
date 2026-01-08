import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Job, User } from '@/lib/types';

interface VariationOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmitProposal: (description: string, amount: number) => Promise<void>;
    onSubmitRequest: (description: string) => Promise<void>;
    isInstaller: boolean;
}

export function VariationOrderDialog({ open, onOpenChange, onSubmitProposal, onSubmitRequest, isInstaller }: VariationOrderDialogProps) {
    const [activeTab, setActiveTab] = useState(isInstaller ? 'propose' : 'request');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!description.trim()) return;
        setIsLoading(true);
        try {
            if (activeTab === 'propose') {
                await onSubmitProposal(description, amount);
            } else {
                await onSubmitRequest(description);
            }
            onOpenChange(false);
            setDescription('');
            setAmount(0);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Manage Variation Order</DialogTitle>
                    <DialogDescription>
                        {isInstaller
                            ? "Propose a scope change (Variation Order) to the client."
                            : "Request additional work from the installer."}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Hide Tabs if role is fixed, or allow switching if agile? Usually roles are fixed per session. */}
                    {/* Actually, user might want to REQUEST (Price TBD) or PROPOSE (if they discussed offline).
                        But usually: Installer proposes Price. User requests Scope. 
                        Let's keep it simple based on role for now. */}

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Description of Extra Work</Label>
                            <Textarea
                                placeholder="e.g. Install extra 5m copper pipe..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        {activeTab === 'propose' && (
                            <div className="space-y-2">
                                <Label>Proposed Amount (₹)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={amount}
                                    onChange={e => setAmount(Number(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">Includes all labor and materials.</p>
                            </div>
                        )}

                        {/* If User is Requesting, they don't set price yet. Installer will Quote. */}
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !description.trim() || (activeTab === 'propose' && amount <= 0)}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {activeTab === 'propose' ? 'Send Proposal' : 'Send Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
