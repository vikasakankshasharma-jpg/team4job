
"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { jobs as mockJobs, users as mockUsers } from "@/lib/data"
import { Loader2 } from "lucide-react"
import { getFirestore, writeBatch, doc, Timestamp, collection } from "firebase/firestore";
import { app } from "@/lib/firebase/client-config";
import type { Job, User, Comment, Bid } from "@/lib/types";

function ThemeSelector() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="w-full">
                    <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

function SeedDatabaseCard() {
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = React.useState(false);
    const db = getFirestore(app);

    const handleSeedDatabase = async () => {
        setIsSeeding(true);
        toast({
            title: "Seeding Started...",
            description: "Populating the database with mock data. Please wait.",
        });

        try {
            const batch = writeBatch(db);

            // 1. Seed Users
            mockUsers.forEach((user: Omit<User, 'memberSince'> & {memberSince: Date | string}) => {
                const userRef = doc(db, "users", user.id);
                const userData = {
                    ...user,
                    memberSince: Timestamp.fromDate(new Date(user.memberSince)),
                };
                batch.set(userRef, userData);
            });
            console.log("Users prepared for batch.");

            // 2. Seed Jobs
            mockJobs.forEach((job: Omit<Job, 'postedAt' | 'deadline' | 'jobStartDate' | 'bids' | 'comments' | 'jobGiver' | 'awardedInstaller'> & {postedAt: any, deadline: any, jobStartDate: any, bids: any[], comments: any[], jobGiver: any, awardedInstaller?: any}) => {
                const jobRef = doc(db, "jobs", job.id);
                
                // Create document references for nested objects
                const jobGiverRef = doc(db, "users", job.jobGiver.id);
                const awardedInstallerRef = job.awardedInstaller ? doc(db, "users", typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller.id) : null;
                
                const bidsWithRefs = job.bids.map(bid => ({
                    ...bid,
                    installer: doc(db, "users", bid.installer.id),
                    timestamp: Timestamp.fromDate(new Date(bid.timestamp)),
                }));

                const commentsWithRefs = job.comments.map(comment => ({
                    ...comment,
                    author: doc(db, "users", comment.author.id),
                    timestamp: Timestamp.fromDate(new Date(comment.timestamp)),
                }));

                const jobData: any = {
                    ...job,
                    postedAt: Timestamp.fromDate(new Date(job.postedAt)),
                    deadline: Timestamp.fromDate(new Date(job.deadline)),
                    jobStartDate: job.jobStartDate ? Timestamp.fromDate(new Date(job.jobStartDate)) : null,
                    jobGiver: jobGiverRef,
                    bids: bidsWithRefs,
                    comments: commentsWithRefs,
                };
                if (awardedInstallerRef) {
                    jobData.awardedInstaller = awardedInstallerRef;
                } else {
                    delete jobData.awardedInstaller;
                }

                batch.set(jobRef, jobData);
            });
            console.log("Jobs prepared for batch.");
            
            // Commit the batch
            await batch.commit();

            toast({
                title: "Database Seeded Successfully!",
                description: "Your Firestore database has been populated.",
                variant: "success",
            });

        } catch (error) {
            console.error("Error seeding database:", error);
            toast({
                title: "Seeding Failed",
                description: "An error occurred while seeding the database. Check the console for details.",
                variant: "destructive",
            });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Database</CardTitle>
                <CardDescription>
                    Populate your Firestore database with the initial mock data. This will overwrite any existing data in the 'users' and 'jobs' collections.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <Label>Seed Database</Label>
                        <p className="text-xs text-muted-foreground">
                           Click to populate your database with mock data.
                        </p>
                    </div>
                    <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Seed Data
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    const { toast } = useToast()

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>
                        Manage your account and app preferences.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Appearance</CardTitle>
                                <CardDescription>Customize the look and feel of the application.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ThemeSelector />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Notifications</CardTitle>
                                <CardDescription>Manage how you receive notifications.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label>Email Notifications</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive emails about job updates and bids.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                     <div className="space-y-0.5">
                                        <Label>Push Notifications</Label>
                                         <p className="text-xs text-muted-foreground">
                                            Get real-time alerts on your device.
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <SeedDatabaseCard />

                     <Card>
                        <CardHeader>
                            <CardTitle>Account Management</CardTitle>
                            <CardDescription>
                                Manage your account settings and data.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Label>Change Password</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Update your account password.
                                    </p>
                                </div>
                                <Button variant="outline">Change Password</Button>
                            </div>
                             <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-3">
                                <div>
                                    <Label className="text-destructive">Delete Account</Label>
                                    <p className="text-xs text-destructive/70">
                                        Permanently delete your account and all associated data.
                                    </p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Delete Account</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your
                                            account and remove your data from our servers.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                toast({
                                                    title: "Account Deletion Requested",
                                                    description: "Your account is scheduled for deletion. This is a simulated action.",
                                                    variant: "destructive"
                                                })
                                            }}
                                        >
                                            Continue
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    )
}
