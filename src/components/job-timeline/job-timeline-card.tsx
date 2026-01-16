"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "./timeline";
import { CommunicationFeed } from "./communication-feed";
import { buildJobTimeline, CommunicationItem, TimelineEvent } from "@/lib/services/timeline-builder";
import { Job, User } from "@/lib/types";
import { useFirebase } from "@/hooks/use-user";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Loader2, MessageSquare, Clock } from "lucide-react";

interface JobTimelineCardProps {
    job: Job;
    currentUser: User;
    otherParticipant?: User;  // The installer
    onRefresh?: () => void;
}

export function JobTimelineCard({
    job,
    currentUser,
    otherParticipant,
    onRefresh
}: JobTimelineCardProps) {
    const { db } = useFirebase();
    const [communications, setCommunications] = useState<CommunicationItem[]>([]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    // Listen to communications collection
    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, `jobs/${job.id}/communications`),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const comms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as CommunicationItem));

            setCommunications(comms);

            // Count unread messages from others
            const unread = comms.filter(c =>
                c.author !== currentUser.id &&
                c.author !== 'system' &&
                !c.read
            ).length;
            setUnreadCount(unread);

            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, job.id, currentUser.id]);

    // Build timeline when job or communications change
    useEffect(() => {
        const events = buildJobTimeline(job, communications);
        setTimeline(events);
    }, [job, communications]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Job Timeline</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Job Timeline
                </CardTitle>
                <CardDescription>
                    Track progress and communicate with your installer
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="timeline" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="timeline">
                            <Clock className="h-4 w-4 mr-2" />
                            Timeline
                        </TabsTrigger>
                        <TabsTrigger value="messages" className="relative">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Messages
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="mt-4">
                        <Timeline events={timeline} />
                    </TabsContent>

                    <TabsContent value="messages" className="mt-4">
                        <CommunicationFeed
                            jobId={job.id!}
                            currentUser={currentUser}
                            otherParticipant={otherParticipant}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
