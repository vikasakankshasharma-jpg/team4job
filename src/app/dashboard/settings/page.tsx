
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
import { db } from "@/lib/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import { jobs as mockJobs, users as mockUsers } from "@/lib/data"
import { Loader2 } from "lucide-react"

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

    const handleSeedDatabase = async () => {
        setIsSeeding(true);
        try {
            const batch = writeBatch(db);

            // Seed users
            const usersCollection = collection(db, "users");
            mockUsers.forEach(user => {
                const userDoc = doc(usersCollection, user.id);
                batch.set(userDoc, user);
            });

            // Seed jobs
            const jobsCollection = collection(db, "jobs");
            mockJobs.forEach(job => {
                const jobDoc = doc(jobsCollection, job.id);
                // Important: Convert user objects to Firestore references
                const jobData = {
                    ...job,
                    jobGiver: doc(db, 'users', job.jobGiver.id),
                    bids: job.bids.map(bid => ({
                        ...bid,
                        installer: doc(db, 'users', bid.installer.id)
                    })),
                    comments: job.comments.map(comment => ({
                        ...comment,
                        author: doc(db, 'users', comment.author.id)
                    }))
                };
                batch.set(jobDoc, jobData);
            });

            await batch.commit();

            toast({
                title: "Database Seeded!",
                description: "Your Firestore database has been populated with mock data.",
                variant: "success",
            });
        } catch (error) {
            console.error("Error seeding database: ", error);
            toast({
                title: "Seeding Failed",
                description: "Could not seed the database. Check the console for errors.",
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
                    Populate your Firestore database with the initial mock data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <Label>Seed Database</Label>
                        <p className="text-xs text-muted-foreground">
                           Click this to upload all users and jobs.
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

    