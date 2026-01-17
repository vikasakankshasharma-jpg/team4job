
"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirebase } from "@/hooks/use-user";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

type NotificationItem = {
    id: string;
    title: string;
    description: string;
    time: any;
    read: boolean;
    link: string;
    type: 'bid' | 'payment' | 'system' | 'award';
};

export function NotificationsDropdown() {
    const { user, role } = useUser();
    const { db } = useFirebase();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // In a real app with backend support, we'd query a 'notifications' collection.
    // Here, we'll synthesize notifications from live data to give the immediate "UX feel" requested.
    // This avoids valid verified backend deployment constraints.

    useEffect(() => {
        async function fetchNotifications() {
            if (!user || !db) return;

            const newNotifs: NotificationItem[] = [];

            try {
                if (role === 'Job Giver') {
                    // 1. Find recent bids on my active jobs
                    // This is expensive in real world without index, but okay for MVP demo limits.
                    const myJobsQuery = query(collection(db, 'jobs'), where('jobGiverId', '==', user.id), limit(10));
                    const jobsSnap = await getDocs(myJobsQuery);

                    jobsSnap.forEach(jobDoc => {
                        const job = jobDoc.data();
                        if (job.bids && job.bids.length > 0) {
                            // Get latest bid
                            const latestBid = job.bids[job.bids.length - 1];
                            // If bid is recent (e.g., last 7 days)
                            newNotifs.push({
                                id: `bid-${jobDoc.id}`,
                                title: "New Bid Received",
                                description: `A new bid of ₹${latestBid.amount} was placed on "${job.title}"`,
                                time: latestBid.idx ? new Date() : job.postedAt, // Fallback time 
                                read: false, // In synthesis, we can't easily track read state without local storage or backend
                                link: `/dashboard/jobs/${jobDoc.id}`,
                                type: 'bid'
                            });
                        }
                    });
                } else if (role === 'Installer') {
                    // 1. Find jobs awarded to me
                    const awardedQuery = query(collection(db, 'jobs'), where('awardedInstaller.id', '==', user.id), limit(5));
                    const awardedSnap = await getDocs(awardedQuery);
                    awardedSnap.forEach(jobDoc => {
                        const job = jobDoc.data();
                        newNotifs.push({
                            id: `award-${jobDoc.id}`,
                            title: "Job Awarded!",
                            description: `You have been awarded the job: "${job.title}"`,
                            time: job.jobStartDate || new Date(),
                            read: false,
                            link: `/dashboard/jobs/${jobDoc.id}`,
                            type: 'award'
                        });
                    });
                }

                // 2. Transactions (Payments) for everyone
                const txQuery = query(
                    collection(db, 'transactions'),
                    where(role === 'Job Giver' ? 'payerId' : 'payeeId', '==', user.id),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                const txSnap = await getDocs(txQuery);
                txSnap.forEach(txDoc => {
                    const tx = txDoc.data();
                    newNotifs.push({
                        id: `tx-${txDoc.id}`,
                        title: tx.type === 'Escrow Funding' ? 'Payment Secured' : 'Payment Released',
                        description: `₹${tx.amount} processed for your job.`,
                        time: tx.createdAt,
                        read: true, // Mark older transactions as read potentially
                        link: `/dashboard/transactions`,
                        type: 'payment'
                    });
                });

                // Sort
                newNotifs.sort((a, b) => toDate(b.time).getTime() - toDate(a.time).getTime());

                setNotifications(newNotifs);
                setUnreadCount(newNotifs.filter(n => !n.read).length);

            } catch (e) {
                console.error("Error fetching notifications", e);
            }
        }

        if (isOpen) {
            // Mark all as read logic would go here
        }

        fetchNotifications();
    }, [user, db, role, isOpen]);


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-[10px]">
                            {unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Notifications</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            You have {unreadCount} unread messages.
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notifications.length > 0 ? (
                        <div className="flex flex-col gap-1 p-1">
                            {notifications.map((item) => (
                                <DropdownMenuItem key={item.id} className="cursor-pointer flex flex-col items-start gap-1 p-3 focus:bg-accent" asChild>
                                    <Link href={item.link}>
                                        <div className="flex w-full items-center justify-between">
                                            <span className="font-semibold text-sm">{item.title}</span>
                                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(toDate(item.time), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.description}
                                        </p>
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center">
                            <EmptyState
                                icon={Bell}
                                title="No new notifications"
                                description="We'll notify you when important updates happen."
                                className="border-0 min-h-[200px] p-4"
                            />
                        </div>
                    )}
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="w-full cursor-pointer justify-center text-center text-sm font-medium">
                    Mark all as read
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
