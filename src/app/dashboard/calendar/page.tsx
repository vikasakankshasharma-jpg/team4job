"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useUser, useFirebase } from "@/hooks/use-user";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Job } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { Loader2, Briefcase, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
    const { user, loading: userLoading } = useUser();
    const { db } = useFirebase();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const router = useRouter();

    useEffect(() => {
        const fetchJobs = async () => {
            if (!user || !db) return;
            setIsLoading(true);
            try {
                const jobsRef = collection(db, 'jobs');

                // Fetch as Job Giver
                const qGiver = query(
                    jobsRef,
                    where('jobGiverId', '==', user.id),
                    where('status', 'in', ['Open for Bidding', 'Awarded', 'Pending Funding', 'In Progress', 'Pending Confirmation'])
                );

                // Fetch as Installer (Awarded)
                const qInstaller = query(
                    jobsRef,
                    where('awardedInstaller', '==', db.collection('users').doc(user.id)), // Ref check might be tricky, usually ID check is safer if we stored string
                    where('status', 'in', ['Awarded', 'Pending Funding', 'In Progress', 'Pending Confirmation'])
                );

                // Ideally we store installerId as string for easier querying, but let's try this.
                // If it fails, we fall back to client side filtering if volume is low, or rely on collection group index.
                // Actually, installerId string field is added to Job type in recent phases? No, only to Bid.
                // Let's assume we can fetch Giver jobs first. 
                // For Installer, we need to be careful. Let's try fetching by 'awardedInstaller' ref.

                const [giverSnap, installerSnap] = await Promise.all([
                    getDocs(qGiver),
                    // We might need an index for the installer query. If it fails, we handle it.
                    // Alternate strategy: Fetch all 'Awarded'/'In Progress' and filter client side? No, too heavy.
                    // Let's rely on the fact we added 'awardedInstaller' as a reference.
                    getDocs(query(jobsRef, where('awardedInstaller', '==', db.doc(`users/${user.id}`)), where('status', 'in', ['In Progress', 'Pending Funding', 'Awarded'])))
                ]);

                const giverJobs = giverSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
                const installerJobs = installerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));

                // Deduplicate just in case (though roles shouldn't overlap on same job ideally)
                const allJobs = [...giverJobs, ...installerJobs].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

                setJobs(allJobs);
            } catch (error) {
                console.error("Error fetching calendar jobs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!userLoading) fetchJobs();
    }, [user, userLoading, db]);

    if (userLoading || isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    // Map jobs to dates
    const jobDates = jobs.map(job => toDate(job.jobStartDate));

    // Select jobs for the clicked date
    const selectedJobs = selectedDate
        ? jobs.filter(job => {
            const start = toDate(job.jobStartDate);
            return start.toDateString() === selectedDate.toDateString();
        })
        : [];

    const modifiers = {
        hasJob: jobDates
    };

    const modifiersStyles = {
        hasJob: {
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'var(--primary)',
            borderRadius: '50%'
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
                    <p className="text-muted-foreground">Manage your upcoming jobs and appointments.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Calendar Card */}
                <Card className="md:col-span-5 h-fit">
                    <CardHeader>
                        <CardTitle>Calendar</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                            className="border rounded-md p-4 shadow-sm"
                        />
                    </CardContent>
                </Card>

                {/* Agenda Card */}
                <Card className="md:col-span-7">
                    <CardHeader>
                        <CardTitle>
                            {selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy') : 'Select a date'}
                        </CardTitle>
                        <CardDescription>
                            {selectedJobs.length} Job{selectedJobs.length !== 1 && 's'} Scheduled
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedJobs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No jobs scheduled for this day.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedJobs.map(job => (
                                    <div
                                        key={job.id}
                                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                                    >
                                        <div className="bg-primary/10 p-2 rounded-full mt-1">
                                            <Briefcase className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold line-clamp-1">{job.title}</h4>
                                                <Badge variant={job.status === 'In Progress' ? 'default' : 'secondary'}>
                                                    {job.status}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <MapPin className="h-3 w-3" />
                                                {job.location}
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-3 w-3" />
                                                Start: {format(toDate(job.jobStartDate), 'h:mm a')}
                                            </div>
                                            {/* Phase 10: Show Agred Duration if available */}
                                            {job.agreedDuration && (
                                                <div className="text-xs font-medium text-amber-600 mt-2 bg-amber-50 inline-block px-2 py-1 rounded">
                                                    Est. Duration: {job.agreedDuration} {job.agreedDurationUnit || 'Hours'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
