
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
import { useUser, useFirebase } from "@/hooks/use-user"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Gem, Medal, Percent, ShieldCheck, IndianRupee, Gift, Loader2, Ticket, Package, Ban, Settings as SettingsIcon } from "lucide-react"
import { useHelp } from "@/hooks/use-help"
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"
import type { PlatformSettings, SubscriptionPlan, Coupon, BlacklistEntry } from "@/lib/types"

import SubscriptionPlansSettings from "../subscription-plans/page"
import CouponsSettings from "../coupons/page"
import BlacklistSettings from "../blacklist/page"

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
    const { role } = useUser()
    const [deleteConfirmation, setDeleteConfirmation] = React.useState("")
    const isDeleteDisabled = deleteConfirmation !== "Delete"
    const isTeamMember = role === 'Admin' || role === 'Support Team';
    
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
                    {!isTeamMember && (
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const initialSettings: PlatformSettings = {
    installerCommissionRate: 10,
    jobGiverFeeRate: 2,
    proInstallerPlanPrice: 2999,
    businessJobGiverPlanPrice: 4999,
    bidBundle10: 500,
    bidBundle25: 1100,
    bidBundle50: 2000,
    defaultTrialPeriodDays: 30,
    freeBidsForNewInstallers: 10,
    freePostsForNewJobGivers: 3,
    pointsForJobCompletion: 50,
    pointsFor5StarRating: 20,
    pointsFor4StarRating: 10,
    penaltyFor1StarRating: -25,
    silverTierPoints: 500,
    goldTierPoints: 1000,
    platinumTierPoints: 2000,
    minJobBudget: 500,
    autoVerifyInstallers: true
};

function MonetizationSettings({ plans, coupons, onDataChange }: { plans: SubscriptionPlan[], coupons: Coupon[], onDataChange: () => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState<PlatformSettings>(initialSettings);
    
    React.useEffect(() => {
        if (!db) return;
        const fetchSettings = async () => {
            setIsLoading(true);
            const settingsDoc = await getDoc(doc(db, "settings", "platform"));
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [db]);

    const handleSave = async () => {
        if (!db) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "settings", "platform"), settings, { merge: true });
            toast({
                title: "Settings Saved",
                description: "Monetization settings have been updated.",
                variant: "success",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: Number(value) }));
    };

    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Platform Commission Rates</CardTitle>
                    <CardDescription>Configure platform revenue from commissions and job fees.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="installerCommissionRate">Installer Commission Rate (%)</Label>
                            <Input id="installerCommissionRate" type="number" value={settings.installerCommissionRate} onChange={handleInputChange} min="0" max="100"/>
                            <p className="text-xs text-muted-foreground">The percentage taken from the installer's earnings.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobGiverFeeRate">Job Giver Fee Rate (%)</Label>
                            <Input id="jobGiverFeeRate" type="number" value={settings.jobGiverFeeRate} onChange={handleInputChange} min="0" max="100"/>
                            <p className="text-xs text-muted-foreground">The percentage charged to the job giver on the bid amount.</p>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Commissions
                    </Button>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Bid Bundles (1-Year Validity)</CardTitle>
                     <CardDescription>Set the pricing for installers to purchase bundles of bids.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bidBundle10">10 Bids (₹)</Label>
                            <Input id="bidBundle10" type="number" value={settings.bidBundle10} onChange={handleInputChange} min="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bidBundle25">25 Bids (₹)</Label>
                            <Input id="bidBundle25" type="number" value={settings.bidBundle25} onChange={handleInputChange} min="0" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bidBundle50">50 Bids (₹)</Label>
                            <Input id="bidBundle50" type="number" value={settings.bidBundle50} onChange={handleInputChange} min="0" />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Bid Prices
                    </Button>
                </CardFooter>
            </Card>

            <SubscriptionPlansSettings plans={plans} onDataChange={onDataChange} />
            <CouponsSettings coupons={coupons} onDataChange={onDataChange} />
        </div>
    )
}

function UserReputationSettings() {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState<PlatformSettings>(initialSettings);

    React.useEffect(() => {
        if (!db) return;
        const fetchSettings = async () => {
            setIsLoading(true);
            const settingsDoc = await getDoc(doc(db, "settings", "platform"));
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [db]);

    const handleSave = async () => {
        if (!db) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "settings", "platform"), settings, { merge: true });
            toast({
                title: "Settings Saved",
                description: "Reputation settings have been updated.",
                variant: "success",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: Number(value) }));
    };

    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

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
                             <Label htmlFor="defaultTrialPeriodDays">Default Trial Period (days)</Label>
                             <Input id="defaultTrialPeriodDays" type="number" value={settings.defaultTrialPeriodDays} onChange={handleInputChange} min="0" />
                             <p className="text-xs text-muted-foreground">
                               Trial length for new Job Givers and Installers.
                            </p>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="freeBidsForNewInstallers">Free Bids for New Installers</Label>
                             <Input id="freeBidsForNewInstallers" type="number" value={settings.freeBidsForNewInstallers} onChange={handleInputChange} min="0" />
                              <p className="text-xs text-muted-foreground">
                               Number of free bids a new installer gets.
                            </p>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="freePostsForNewJobGivers">Free Posts for New Job Givers</Label>
                             <Input id="freePostsForNewJobGivers" type="number" value={settings.freePostsForNewJobGivers} onChange={handleInputChange} min="0" />
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
                         <Label htmlFor="pointsForJobCompletion">Points for Job Completion</Label>
                         <Input id="pointsForJobCompletion" type="number" value={settings.pointsForJobCompletion} onChange={handleInputChange} />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="pointsFor5StarRating">Points for 5-Star Rating</Label>
                         <Input id="pointsFor5StarRating" type="number" value={settings.pointsFor5StarRating} onChange={handleInputChange} />
                       </div>
                        <div className="space-y-2">
                         <Label htmlFor="pointsFor4StarRating">Points for 4-Star Rating</Label>
                         <Input id="pointsFor4StarRating" type="number" value={settings.pointsFor4StarRating} onChange={handleInputChange} />
                       </div>
                         <div className="space-y-2">
                         <Label htmlFor="penaltyFor1StarRating">Penalty for 1-Star Rating</Label>
                         <Input id="penaltyFor1StarRating" type="number" value={settings.penaltyFor1StarRating} onChange={handleInputChange} />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Reputation Tier Thresholds (Points Required)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="silverTierPoints" className="flex items-center gap-2"><Medal className="h-4 w-4 text-gray-400" /> Silver</Label>
                         <Input id="silverTierPoints" type="number" value={settings.silverTierPoints} onChange={handleInputChange} />
                       </div>
                        <div className="space-y-2">
                         <Label htmlFor="goldTierPoints" className="flex items-center gap-2"><Gem className="h-4 w-4 text-amber-500" /> Gold</Label>
                         <Input id="goldTierPoints" type="number" value={settings.goldTierPoints} onChange={handleInputChange} />
                       </div>
                         <div className="space-y-2">
                         <Label htmlFor="platinumTierPoints" className="flex items-center gap-2"><Gem className="h-4 w-4 text-cyan-400" /> Platinum</Label>
                         <Input id="platinumTierPoints" type="number" value={settings.platinumTierPoints} onChange={handleInputChange} />
                       </div>
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSaving}>
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Save Reputation Settings
                 </Button>
            </CardFooter>
        </Card>
    );
}

function PlatformRulesSettings({ blacklist, onDataChange } : { blacklist: BlacklistEntry[], onDataChange: () => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState<PlatformSettings>(initialSettings);
    
    React.useEffect(() => {
        if (!db) return;
        const fetchSettings = async () => {
            setIsLoading(true);
            const settingsDoc = await getDoc(doc(db, "settings", "platform"));
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [db]);
    
    const handleSave = async () => {
        if (!db) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "settings", "platform"), settings, { merge: true });
            toast({
                title: "Settings Saved",
                description: "Platform rules have been updated.",
                variant: "success",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: Number(value) }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setSettings(prev => ({...prev, autoVerifyInstallers: checked }));
    }

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Job & Content Rules</CardTitle>
                <CardDescription>Set global rules for job postings and content on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="minJobBudget" className="flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Minimum Job Budget</Label>
                     <div className="flex items-center gap-2">
                        <Input
                            id="minJobBudget"
                            type="number"
                            value={settings.minJobBudget}
                            onChange={handleInputChange}
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
                    <Label htmlFor="autoVerifyInstallers" className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Automatic Installer Verification</Label>
                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="autoVerifyInstallers" 
                            checked={settings.autoVerifyInstallers}
                            onCheckedChange={handleSwitchChange}
                        />
                        <Label htmlFor="autoVerifyInstallers" className="text-sm font-normal">Enable automatic Aadhar verification for new installers.</Label>
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSaving}>
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Save Job Rules
                 </Button>
            </CardFooter>
        </Card>
        <BlacklistSettings blacklist={blacklist} onDataChange={onDataChange} />
      </div>
    );
}


export default function SettingsPage() {
    const { isAdmin, loading: userLoading } = useUser();
    const { setHelp } = useHelp();
    const { db } = useFirebase();
    
    const [plans, setPlans] = React.useState<SubscriptionPlan[]>([]);
    const [coupons, setCoupons] = React.useState<Coupon[]>([]);
    const [blacklist, setBlacklist] = React.useState<BlacklistEntry[]>([]);
    const [loadingData, setLoadingData] = React.useState(true);

    const fetchData = React.useCallback(async () => {
        if (!db || !isAdmin) return;
        setLoadingData(true);
        const [plansSnap, couponsSnap, blacklistSnap] = await Promise.all([
            getDocs(collection(db, "subscriptionPlans")),
            getDocs(collection(db, "coupons")),
            getDocs(collection(db, "blacklist")),
        ]);
        setPlans(plansSnap.docs.map(d => d.data() as SubscriptionPlan));
        setCoupons(couponsSnap.docs.map(d => d.data() as Coupon));
        setBlacklist(blacklistSnap.docs.map(d => d.data() as BlacklistEntry));
        setLoadingData(false);
    }, [db, isAdmin]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);


    React.useEffect(() => {
    setHelp({
        title: "Settings",
        content: (
            <div className="space-y-4 text-sm">
                <p>This page allows you to configure your personal settings and, if you're an admin, global platform settings.</p>
                {isAdmin ? (
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">Monetization:</span> Manage subscription plans, coupons, and set commission rates.</li>
                        <li><span className="font-semibold">User & Reputation:</span> Define the points and tier system for installer reputation.</li>
                        <li><span className="font-semibold">Platform Rules:</span> Set global rules like minimum job budget and manage the platform blacklist.</li>
                        <li><span className="font-semibold">General:</span> Change your personal settings like theme and notifications.</li>
                    </ul>
                ) : (
                     <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">Appearance:</span> Switch between light, dark, and system themes.</li>
                        <li><span className="font-semibold">Notifications:</span> Manage your email and push notification preferences.</li>
                        <li><span className="font-semibold">Account Management:</span> Change your password or delete your account.</li>
                    </ul>
                )}
            </div>
        )
    })
  }, [setHelp, isAdmin]);

    if (userLoading || loadingData && isAdmin) {
        return (
            <div className="grid gap-6">
                <h1 className="text-3xl font-bold">Settings</h1>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

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
            <Tabs defaultValue="monetization" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="monetization">
                        <Package className="mr-2 h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline">Monetization</span>
                    </TabsTrigger>
                    <TabsTrigger value="reputation">
                         <Gem className="mr-2 h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline">User & Reputation</span>
                    </TabsTrigger>
                    <TabsTrigger value="platform">
                         <Ban className="mr-2 h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline">Platform Rules</span>
                    </TabsTrigger>
                    <TabsTrigger value="general">
                        <SettingsIcon className="mr-2 h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline">General</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="monetization">
                    <MonetizationSettings plans={plans} coupons={coupons} onDataChange={fetchData} />
                </TabsContent>
                <TabsContent value="reputation">
                    <UserReputationSettings />
                </TabsContent>
                <TabsContent value="platform">
                    <PlatformRulesSettings blacklist={blacklist} onDataChange={fetchData} />
                </TabsContent>
                <TabsContent value="general">
                    <PersonalSettingsCard />
                </TabsContent>
            </Tabs>
        </div>
    )
}

    