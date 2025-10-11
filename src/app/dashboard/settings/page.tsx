
"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useUser } from "@/hooks/use-user"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Gem, Medal, Percent, ShieldCheck, IndianRupee, Gift } from "lucide-react"

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

function PersonalSettingsCard() {
    const { toast } = useToast()
    const [deleteConfirmation, setDeleteConfirmation] = React.useState("")
    const isDeleteDisabled = deleteConfirmation !== "Delete"
    
    return (
        <div className="space-y-6">
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
                                    This action cannot be undone. To confirm, please type{" "}
                                    <span className="font-semibold text-foreground">Delete</span> in the box below.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                    <Input 
                                        id="delete-confirm"
                                        placeholder="Type 'Delete' to confirm"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    />
                                </div>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={isDeleteDisabled}
                                    onClick={() => {
                                        if (isDeleteDisabled) return;
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
        </div>
    );
}

function MonetizationSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Monetization</CardTitle>
                <CardDescription>Configure how the platform generates revenue through commissions, subscriptions, and bid bundles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4">
                     <h3 className="font-semibold flex items-center gap-2"><Percent className="h-4 w-4" /> Platform Commission Rates</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label htmlFor="installer-commission-rate">Installer Commission Rate (%)</Label>
                             <Input
                                id="installer-commission-rate"
                                type="number"
                                defaultValue="10"
                                min="0"
                                max="100"
                            />
                             <p className="text-xs text-muted-foreground">
                                The percentage taken from the installer's earnings.
                            </p>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="jobgiver-commission-rate">Job Giver Fee Rate (%)</Label>
                             <Input
                                id="jobgiver-commission-rate"
                                type="number"
                                defaultValue="2"
                                min="0"
                                max="100"
                            />
                              <p className="text-xs text-muted-foreground">
                                The percentage charged to the job giver on the bid amount.
                            </p>
                        </div>
                     </div>
                </div>

                 <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Subscription Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Installer Pro Plan (₹/year)</Label>
                         <Input type="number" defaultValue="2999" />
                       </div>
                        <div className="space-y-2">
                         <Label>Job Giver Business Plan (₹/year)</Label>
                         <Input type="number" defaultValue="4999" />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Bid Bundles (1-Year Validity)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="space-y-2">
                         <Label>10 Bids (₹)</Label>
                         <Input type="number" defaultValue="500" />
                       </div>
                        <div className="space-y-2">
                         <Label>25 Bids (₹)</Label>
                         <Input type="number" defaultValue="1100" />
                       </div>
                         <div className="space-y-2">
                         <Label>50 Bids (₹)</Label>
                         <Input type="number" defaultValue="2000" />
                       </div>
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button>Save Monetization Settings</Button>
            </CardFooter>
        </Card>
    );
}

function UserReputationSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>User & Reputation</CardTitle>
                <CardDescription>Define the rules for the installer reputation system, including points and tier thresholds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> New User Onboarding</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                             <Label htmlFor="trial-days">Default Trial Period (days)</Label>
                             <Input
                                id="trial-days"
                                type="number"
                                defaultValue="30"
                                min="0"
                            />
                             <p className="text-xs text-muted-foreground">
                               Trial length for new Job Givers and Installers.
                            </p>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="free-bids">Free Bids for New Installers</Label>
                             <Input
                                id="free-bids"
                                type="number"
                                defaultValue="10"
                                min="0"
                            />
                              <p className="text-xs text-muted-foreground">
                               Number of free bids a new installer gets.
                            </p>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="free-jobs">Free Posts for New Job Givers</Label>
                             <Input
                                id="free-jobs"
                                type="number"
                                defaultValue="3"
                                min="0"
                            />
                              <p className="text-xs text-muted-foreground">
                               Number of free job posts a new job giver gets.
                            </p>
                        </div>
                     </div>
                </div>
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Reputation Point System</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Points for Job Completion</Label>
                         <Input type="number" defaultValue="50" />
                       </div>
                       <div className="space-y-2">
                         <Label>Points for 5-Star Rating</Label>
                         <Input type="number" defaultValue="20" />
                       </div>
                        <div className="space-y-2">
                         <Label>Points for 4-Star Rating</Label>
                         <Input type="number" defaultValue="10" />
                       </div>
                         <div className="space-y-2">
                         <Label>Penalty for 1-Star Rating</Label>
                         <Input type="number" defaultValue="-25" />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Reputation Tier Thresholds (Points Required)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="space-y-2">
                         <Label className="flex items-center gap-2"><Medal className="h-4 w-4 text-gray-400" /> Silver</Label>
                         <Input type="number" defaultValue="500" />
                       </div>
                        <div className="space-y-2">
                         <Label className="flex items-center gap-2"><Gem className="h-4 w-4 text-amber-500" /> Gold</Label>
                         <Input type="number" defaultValue="1000" />
                       </div>
                         <div className="space-y-2">
                         <Label className="flex items-center gap-2"><Gem className="h-4 w-4 text-cyan-400" /> Platinum</Label>
                         <Input type="number" defaultValue="2000" />
                       </div>
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button>Save Reputation Settings</Button>
            </CardFooter>
        </Card>
    );
}

function PlatformRulesSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Platform Rules</CardTitle>
                <CardDescription>Set global rules for job postings, bidding, and content on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="min-budget" className="flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Minimum Job Budget</Label>
                     <div className="flex items-center gap-2">
                        <Input
                            id="min-budget"
                            type="number"
                            defaultValue="500"
                            min="0"
                            className="max-w-[120px]"
                        />
                         <span className="text-muted-foreground">₹</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The minimum budget required for any new job posting.
                    </p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="auto-verify" className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Automatic Installer Verification</Label>
                    <div className="flex items-center space-x-2">
                        <Switch id="auto-verify" defaultChecked />
                        <Label htmlFor="auto-verify" className="text-sm font-normal">Enable automatic Aadhar verification for new installers.</Label>
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button>Save Platform Rules</Button>
            </CardFooter>
        </Card>
    );
}


export default function SettingsPage() {
    const { isAdmin } = useUser();

    if (!isAdmin) {
        return (
            <div className="grid gap-6">
                <h1 className="text-3xl font-bold">Settings</h1>
                <PersonalSettingsCard />
            </div>
        )
    }

    return (
        <div className="grid gap-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <Tabs defaultValue="platform" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="platform">Platform Rules</TabsTrigger>
                    <TabsTrigger value="monetization">Monetization</TabsTrigger>
                    <TabsTrigger value="reputation">User &amp; Reputation</TabsTrigger>
                    <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>
                <TabsContent value="platform">
                    <PlatformRulesSettings />
                </TabsContent>
                <TabsContent value="monetization">
                    <MonetizationSettings />
                </TabsContent>
                <TabsContent value="reputation">
                    <UserReputationSettings />
                </TabsContent>
                <TabsContent value="general">
                    <PersonalSettingsCard />
                </TabsContent>
            </Tabs>
        </div>
    )
}

    