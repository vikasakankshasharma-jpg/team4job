"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bid, User, Job } from "@/lib/types";
import { toDate, getRefId } from "@/lib/utils";
import {
    CheckCircle2,
    Award,
    Clock,
    TrendingDown,
    Shield,
    Star,
    MessageSquare,
    Trophy
} from "lucide-react";
import { format } from "date-fns";

interface BidComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    bids: Bid[];
    onAward: (bid: Bid) => void;
    job?: Job;
}

export function BidComparisonModal({
    isOpen,
    onClose,
    bids,
    onAward,
    job
}: BidComparisonModalProps) {
    const [selectedBidId, setSelectedBidId] = useState<string | null>(null);

    if (!bids || bids.length === 0) return null;

    // Find the lowest bid
    const lowestBid = bids.reduce((min, bid) => bid.amount < min.amount ? bid : min, bids[0]);

    const handleAward = () => {
        const bid = bids.find(b => b.id === selectedBidId);
        if (bid) {
            onAward(bid);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-amber-500" />
                        Compare Bids ({bids.length} selected)
                    </DialogTitle>
                    <DialogDescription>
                        Review and compare installations bids side-by-side. The lowest bid is highlighted.
                    </DialogDescription>
                </DialogHeader>

                {/* Comparison Table */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-border">
                                        <th className="text-left p-3 font-semibold text-sm text-muted-foreground sticky left-0 bg-background z-10">
                                            Criteria
                                        </th>
                                        {bids.map((bid) => {
                                            const installer = bid.installer as User;
                                            const isLowest = bid.id === lowestBid.id;
                                            return (
                                                <th
                                                    key={bid.id}
                                                    className={`text-center p-3 min-w-[200px] ${isLowest ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-500' : ''
                                                        } ${selectedBidId === bid.id ? 'ring-2 ring-primary' : ''}`}
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Avatar className="h-12 w-12">
                                                            <AnimatedAvatar svg={installer.realAvatarUrl} />
                                                            <AvatarFallback>{installer.name.substring(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold text-sm">{installer.name}</p>
                                                            {isLowest && (
                                                                <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700 text-xs">
                                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                                    Lowest Bid
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Bid Amount Row */}
                                    <tr className="border-b border-border hover:bg-muted/50">
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                            <div className="flex items-center gap-2">
                                                <Award className="h-4 w-4 text-amber-500" />
                                                Bid Amount
                                            </div>
                                        </td>
                                        {bids.map((bid) => {
                                            const isLowest = bid.id === lowestBid.id;
                                            return (
                                                <td
                                                    key={bid.id}
                                                    className={`text-center p-3 font-bold text-lg ${isLowest ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' : ''
                                                        }`}
                                                >
                                                    ₹{bid.amount.toLocaleString()}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Rating Row */}
                                    <tr className="border-b border-border hover:bg-muted/50">
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                            <div className="flex items-center gap-2">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                Rating
                                            </div>
                                        </td>
                                        {bids.map((bid) => {
                                            const installer = bid.installer as User;
                                            return (
                                                <td key={bid.id} className="text-center p-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                        <span className="font-semibold">{installer.installerProfile?.rating.toFixed(1)}</span>
                                                        <span className="text-xs text-muted-foreground">({installer.installerProfile?.reviews})</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Tier Row */}
                                    <tr className="border-b border-border hover:bg-muted/50">
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-cyan-500" />
                                                Tier
                                            </div>
                                        </td>
                                        {bids.map((bid) => {
                                            const installer = bid.installer as User;
                                            const tierColor = {
                                                Bronze: "text-amber-700 bg-amber-100 border-amber-200",
                                                Silver: "text-slate-600 bg-slate-100 border-slate-200",
                                                Gold: "text-yellow-600 bg-yellow-100 border-yellow-200",
                                                Platinum: "text-cyan-600 bg-cyan-100 border-cyan-200",
                                            }[installer.installerProfile?.tier || "Bronze"];

                                            return (
                                                <td key={bid.id} className="text-center p-3">
                                                    <Badge variant="outline" className={`${tierColor} border`}>
                                                        {installer.installerProfile?.tier}
                                                    </Badge>
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Bid Submitted Row */}
                                    <tr className="border-b border-border hover:bg-muted/50">
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-blue-500" />
                                                Submitted
                                            </div>
                                        </td>
                                        {bids.map((bid) => (
                                            <td key={bid.id} className="text-center p-3 text-sm text-muted-foreground">
                                                {format(toDate(bid.timestamp), "MMM d, h:mm a")}
                                            </td>
                                        ))}
                                    </tr>

                                    {/* Warranty Row (if available) */}
                                    {bids.some(bid => bid.warrantyDuration) && (
                                        <tr className="border-b border-border hover:bg-muted/50">
                                            <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-purple-500" />
                                                    Warranty
                                                </div>
                                            </td>
                                            {bids.map((bid) => (
                                                <td key={bid.id} className="text-center p-3 text-sm">
                                                    {bid.warrantyDuration || "Not specified"}
                                                </td>
                                            ))}
                                        </tr>
                                    )}

                                    {/* Estimated Duration Row (if available) */}
                                    {bids.some(bid => bid.estimatedDuration) && (
                                        <tr className="border-b border-border hover:bg-muted/50">
                                            <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-indigo-500" />
                                                    Duration
                                                </div>
                                            </td>
                                            {bids.map((bid) => (
                                                <td key={bid.id} className="text-center p-3 text-sm">
                                                    {bid.estimatedDuration ? `${bid.estimatedDuration} ${bid.durationUnit || 'Days'}` : "Not specified"}
                                                </td>
                                            ))}
                                        </tr>
                                    )}

                                    {/* Cover Letter Row */}
                                    <tr className="border-b border-border hover:bg-muted/50">
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-teal-500" />
                                                Cover Letter
                                            </div>
                                        </td>
                                        {bids.map((bid) => (
                                            <td key={bid.id} className="p-3">
                                                <p className="text-xs text-muted-foreground italic line-clamp-3">
                                                    {bid.coverLetter || "No cover letter provided."}
                                                </p>
                                            </td>
                                        ))}
                                    </tr>

                                    {/* Selection Row */}
                                    <tr>
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                            <div className="font-semibold text-primary">
                                                Select to Award
                                            </div>
                                        </td>
                                        {bids.map((bid) => (
                                            <td key={bid.id} className="text-center p-3">
                                                <Button
                                                    variant={selectedBidId === bid.id ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedBidId(bid.id!)}
                                                    className="w-full"
                                                >
                                                    {selectedBidId === bid.id ? (
                                                        <>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Selected
                                                        </>
                                                    ) : (
                                                        "Select"
                                                    )}
                                                </Button>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer */}
                <Separator />
                <DialogFooter className="p-6 flex-row justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {selectedBidId ? (
                            <span className="font-medium text-foreground">Ready to award bid</span>
                        ) : (
                            "Select a bid to continue"
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleAward} disabled={!selectedBidId}>
                            <Award className="mr-2 h-4 w-4" />
                            Award Selected Bid
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
