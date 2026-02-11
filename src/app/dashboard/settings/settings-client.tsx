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
import { Gem, Medal, Percent, ShieldCheck, IndianRupee, Gift, Loader2, Ticket, Package, Ban, Settings as SettingsIcon, Bell } from "lucide-react"
import { useHelp } from "@/hooks/use-help"
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"
import type { PlatformSettings, SubscriptionPlan, Coupon, BlacklistEntry } from "@/lib/types"
import { useFirebase } from "@/hooks/use-user"
import { useTranslations } from "next-intl"
import SubscriptionPlansManager from "@/app/dashboard/subscription-plans/subscription-plans-manager"
import CouponsManager from "@/app/dashboard/coupons/coupons-manager"
import BlacklistManager from "@/app/dashboard/blacklist/blacklist-manager"
import { Separator } from "@/components/ui/separator"

function ThemeSelector() {
    const { theme, setTheme } = useTheme()
    const t = useTranslations('settings')
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="space-y-2">
                <Label htmlFor="theme">{t('theme')}</Label>
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="theme">{t('theme')}</Label>
            <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="w-full">
                    <SelectValue placeholder={t('selectTheme')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="light">{t('light')}</SelectItem>
                    <SelectItem value="dark">{t('dark')}</SelectItem>
                    <SelectItem value="system">{t('system')}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

function PersonalSettingsCard() {
    const { toast } = useToast()
    const { role } = useUser()
    const t = useTranslations('settings')
    const [deleteConfirmation, setDeleteConfirmation] = React.useState("")
    const isDeleteDisabled = deleteConfirmation !== "Delete"
    const isTeamMember = role === 'Admin' || role === 'Support Team';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('appearance')}</CardTitle>
                    <CardDescription>{t('appearanceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ThemeSelector />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {t('notifications')}</CardTitle>
                    <CardDescription>{t('notificationsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>{t('pushNotifications')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t('pushNotificationsDesc')}
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>{t('newBids')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t('newBidsDesc')}
                            </p>
                        </div>
                        <Switch defaultChecked disabled={role !== 'Job Giver'} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>{t('jobAwarded')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t('jobAwardedDesc')}
                            </p>
                        </div>
                        <Switch defaultChecked disabled={role !== 'Installer'} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>{t('disputeUpdates')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t('disputeUpdatesDesc')}
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        {t('moreControlsSoon')}
                    </p>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{t('accountManagement')}</CardTitle>
                    <CardDescription>
                        {t('accountManagementDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <Label>{t('changePassword')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t('changePasswordDesc')}
                            </p>
                        </div>
                        <Button variant="outline">{t('changePassword')}</Button>
                    </div>
                    {!isTeamMember && (
                        <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-3">
                            <div>
                                <Label className="text-destructive">{t('deleteAccount')}</Label>
                                <p className="text-xs text-destructive/70">
                                    {t('deleteAccountDesc')}
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">{t('deleteAccount')}</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('deleteAccount')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('deleteConfirmPrompt')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-2">
                                        <Input
                                            id="delete-confirm"
                                            placeholder={t('deleteConfirmPlaceholder')}
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
                                                    title: t('accountDeletionRequested'),
                                                    description: t('accountDeletionRequestedDesc'),
                                                    variant: "destructive"
                                                })
                                            }}
                                        >
                                            {t('continue')}
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

const initialSettings: Partial<PlatformSettings> = {
    installerCommissionRate: 5,
    jobGiverFeeRate: 2,
    defaultTrialPeriodDays: 30,
    freeBidsForNewInstallers: 10,
    freePostsForNewJobGivers: 3,
    pointsForJobCompletion: 50,
    pointsFor5StarRating: 20,
    pointsFor4StarRating: 10,
    penaltyFor1StarRating: -25,
    penaltyForDeclinedJob: -15,
    silverTierPoints: 500,
    goldTierPoints: 1000,
    platinumTierPoints: 2000,
    minJobBudget: 500,
    autoVerifyInstallers: true
};

function MonetizationSettings({ plans, coupons, onDataChange }: { plans: SubscriptionPlan[], coupons: Coupon[], onDataChange: () => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('settings');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState<Partial<PlatformSettings>>({});

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
                description: `Monetization settings have been updated.`,
                variant: "default",
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
                    <CardTitle>{t('platformCommission')}</CardTitle>
                    <CardDescription>{t('platformCommissionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="installerCommissionRate">{t('installerCommission')}</Label>
                            <Input id="installerCommissionRate" type="number" value={settings.installerCommissionRate ?? ''} onChange={handleInputChange} min="0" max="100" />
                            <p className="text-xs text-muted-foreground">{t('installerCommissionHelp')}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobGiverFeeRate">{t('jobGiverFee')}</Label>
                            <Input id="jobGiverFeeRate" type="number" value={settings.jobGiverFeeRate ?? ''} onChange={handleInputChange} min="0" max="100" />
                            <p className="text-xs text-muted-foreground">{t('jobGiverFeeHelp')}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('saveFees')}
                    </Button>
                </CardFooter>
            </Card>

            <SubscriptionPlansManager plans={plans} onDataChange={onDataChange} />
            <CouponsManager coupons={coupons} onDataChange={onDataChange} />
        </div>
    )
}

function UserReputationSettings() {
    const { db } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('settings');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState<Partial<PlatformSettings>>(initialSettings);

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
                variant: "default",
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
                <CardTitle>{t('userReputationSystem')}</CardTitle>
                <CardDescription>{t('userReputationSystemDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="mb-4 text-lg font-medium">{t('growthStrategy')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border p-4">
                        <div className="space-y-2">
                            <Label htmlFor="defaultTrialPeriodDays">{t('trialPeriod')}</Label>
                            <Input id="defaultTrialPeriodDays" type="number" value={settings.defaultTrialPeriodDays} onChange={handleInputChange} min="0" />
                            <p className="text-xs text-muted-foreground">
                                {t('trialPeriodHelp')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="freeBidsForNewInstallers">{t('freeBids')}</Label>
                            <Input id="freeBidsForNewInstallers" type="number" value={settings.freeBidsForNewInstallers} onChange={handleInputChange} min="0" />
                            <p className="text-xs text-muted-foreground">
                                {t('freeBidsHelp')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="freePostsForNewJobGivers">{t('freePosts')}</Label>
                            <Input id="freePostsForNewJobGivers" type="number" value={settings.freePostsForNewJobGivers} onChange={handleInputChange} min="0" />
                            <p className="text-xs text-muted-foreground">
                                {t('freePostsHelp')}
                            </p>
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h3 className="mb-4 text-lg font-medium">{t('reputationPointsSystem')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border p-4">
                        <div className="space-y-2">
                            <Label htmlFor="pointsForJobCompletion">{t('pointsJobCompletion')}</Label>
                            <Input id="pointsForJobCompletion" type="number" value={settings.pointsForJobCompletion} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pointsFor5StarRating">{t('pointsFiveStar')}</Label>
                            <Input id="pointsFor5StarRating" type="number" value={settings.pointsFor5StarRating} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pointsFor4StarRating">{t('pointsFourStar')}</Label>
                            <Input id="pointsFor4StarRating" type="number" value={settings.pointsFor4StarRating} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="penaltyFor1StarRating">{t('penaltyOneStar')}</Label>
                            <Input id="penaltyFor1StarRating" type="number" value={settings.penaltyFor1StarRating} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="penaltyForDeclinedJob">{t('penaltyDeclined')}</Label>
                            <Input id="penaltyForDeclinedJob" type="number" value={settings.penaltyForDeclinedJob} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h3 className="mb-4 text-lg font-medium">{t('tierThresholds')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border p-4">
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
                    {t('saveReputation')}
                </Button>
            </CardFooter>
        </Card>
    );
}

function PlatformRulesSettings({ blacklist, onDataChange }: { blacklist: BlacklistEntry[], onDataChange: () => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('settings');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState<Partial<PlatformSettings>>(initialSettings);

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
                variant: "default",
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
        setSettings(prev => ({ ...prev, autoVerifyInstallers: checked }));
    }

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('jobContentRules')}</CardTitle>
                    <CardDescription>{t('jobContentRulesDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="minJobBudget" className="flex items-center gap-2"><IndianRupee className="h-4 w-4" /> {t('minJobBudget')}</Label>
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
                            {t('minJobBudgetHelp')}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="autoVerifyInstallers" className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {t('autoVerify')}</Label>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="autoVerifyInstallers"
                                checked={settings.autoVerifyInstallers}
                                onCheckedChange={handleSwitchChange}
                            />
                            <Label htmlFor="autoVerifyInstallers" className="text-sm font-normal">{t('autoVerifyHelp')}</Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('saveRules')}
                    </Button>
                </CardFooter>
            </Card>
            <BlacklistManager blacklist={blacklist} onDataChange={onDataChange} />
        </div>
    );
}


export default function SettingsClient() {
    const { isAdmin, loading: userLoading } = useUser();
    const { setHelp } = useHelp();
    const { db } = useFirebase();
    const t = useTranslations('settings');

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
            title: t('platformSettingsHelpTitle'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('platformSettingsHelpContent')}</p>
                    {isAdmin ? (
                        <ul className="list-disc space-y-2 pl-5">
                            <li><span className="font-semibold">Monetization:</span> Manage subscription plans, create promotional coupons, and set your platform&apos;s commission rates. This is where you control how your platform makes money.</li>
                            <li><span className="font-semibold">User &amp; Reputation:</span> Define the &quot;welcome kit&quot; for new users (like free trials) and configure the entire reputation system for installers, including points and tier levels.</li>
                            <li><span className="font-semibold">Platform Rules:</span> Set global rules like the minimum job budget and manage the blacklist for users and pincodes.</li>
                            <li><span className="font-semibold">Growth Strategy:</span> Use the coupon system to execute your growth strategy. For example, create a coupon for a &quot;120-day Pro Installer Plan&quot; and manually send it to the first few high-quality installers who sign up in a new city to bootstrap that local market.</li>
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
    }, [setHelp, isAdmin, t]);

    if (userLoading || loadingData && isAdmin) {
        return (
            <div className="grid gap-6">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="grid gap-6">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <PersonalSettingsCard />
            </div>
        )
    }

    return (
        <div className="grid gap-6 max-w-full overflow-x-hidden px-4">
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <Tabs defaultValue="monetization" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
                    <TabsTrigger value="monetization" className="flex-shrink-0">
                        <Package className="mr-2 h-4 w-4" />
                        <span>{t('tabMonetization')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="reputation" className="flex-shrink-0">
                        <Gem className="mr-2 h-4 w-4" />
                        <span>{t('tabReputation')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="platform" className="flex-shrink-0">
                        <Ban className="mr-2 h-4 w-4" />
                        <span>{t('tabPlatform')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="general" className="flex-shrink-0">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>{t('tabGeneral')}</span>
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
