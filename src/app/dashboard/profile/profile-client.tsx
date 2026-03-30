
"use client";

import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Gem, Medal, Star, ShieldCheck, Briefcase, ChevronsUpDown, TrendingUp, CalendarDays, ArrowRight, PlusCircle, MapPin, Building, Pencil, Check, Loader2, Banknote, Gift, Copy, AlertTriangle, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress";
import React, { useEffect, useCallback } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { allSkills } from "@/lib/data";
import { User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, serverTimestamp } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useHelp } from "@/hooks/use-help";
// import axios from "axios"; // Removed
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";



const tierIcons = {
    Bronze: <Medal className="h-6 w-6 text-yellow-700" />,
    Silver: <Medal className="h-6 w-6 text-gray-400" />,
    Gold: <Gem className="h-6 w-6 text-amber-500" />,
    Platinum: <Gem className="h-6 w-6 text-cyan-400" />,
};

const tierData = {
    'Bronze': { points: 0, next: 'Silver', goal: 500 },
    'Silver': { points: 500, next: 'Gold', goal: 1000 },
    'Gold': { points: 1000, next: 'Platinum', goal: 2000 },
    'Platinum': { points: 2000, next: 'Max', goal: 2000 },
};

const chartConfig = {
    points: {
        label: "Points",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig


const editProfileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    residentialPincode: z.string().regex(/^\d{6}$/, "Must be a 6-digit pincode."),
    officePincode: z.string().optional().refine(val => val === '' || /^\d{6}$/.test(val!), "Must be a 6-digit pincode or empty."),
    gstin: z.string().optional().refine(val => val === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val!), "Invalid GSTIN format."),
});

function EditProfileForm({ user, onSave }: { user: User, onSave: (values: any) => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('profile');
    const isProfessional = user.roles.includes('Professional');

    const form = useForm<z.infer<typeof editProfileSchema>>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            name: user.name || "",
            residentialPincode: user.pincodes?.residential || "",
            officePincode: user.pincodes?.office || "",
            gstin: user.gstin || "",
        },
    });

    async function onSubmit(values: z.infer<typeof editProfileSchema>) {
        if (!user) return;

        const isVerified = user.professionalProfile?.verified;
        const nameChanged = values.name !== user.name;
        const gstinChanged = values.gstin !== (user.gstin || "");

        let shouldUnverify = false;
        if (isVerified && (nameChanged || gstinChanged)) {
            shouldUnverify = true;
        }

        try {
            // @ts-ignore
            const token = await user.getIdToken();
            const updateData: any = {
                name: values.name,
                pincodes: {
                    residential: values.residentialPincode,
                    office: values.officePincode || '',
                },
                gstin: values.gstin || '',
            };

            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error("Failed to update profile");
            }

            onSave(values);

            toast({
                title: t('profileUpdated'),
                description: shouldUnverify
                    ? t('profileUpdatedUnverified')
                    : t('profileUpdatedDesc'),
                variant: shouldUnverify ? "destructive" : "default",
            });
        } catch (error) {
            toast({
                title: t('updateFailed'),
                description: t('updateFailedDesc'),
                variant: "destructive"
            });
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('editProfile')}</DialogTitle>
                <DialogDescription>
                    {t('editProfileDesc')}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('name')}</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="residentialPincode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('residentialPincode')}</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {isProfessional && (
                        <FormField
                            control={form.control}
                            name="officePincode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('officePincode')}</FormLabel>
                                    <FormDescription>
                                        {t('officePincodeDesc')}
                                    </FormDescription>
                                    <FormControl>
                                        <Input placeholder={t('officePincodePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    {isProfessional && (
                        <div className="space-y-4">
                            <Separator />
                            <h4 className="text-sm font-medium">{t('businessGstInfo')}</h4>
                            <FormField
                                control={form.control}
                                name="gstin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('gstin')}</FormLabel>
                                        <FormDescription>
                                            {t('gstinDesc')}
                                        </FormDescription>
                                        <FormControl>
                                            <Input placeholder={t('gstinPlaceholder')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">{t('cancel')}</Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <Button type="submit">{t('saveChanges')}</Button>
                        </DialogClose>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

const ProfessionalOnboardingSchema = z.object({
    pincode: z.string().regex(/^\d{6}$/, { message: "Must be a 6-digit Indian pincode." }),
    skills: z.array(z.string()).min(1, { message: "Please select at least one skill." }),
});

function SkillsEditor({ initialSkills, onSave, userId }: { initialSkills: string[], onSave: (skills: string[]) => void, userId: string }) {
    const { toast } = useToast();
    const { db } = useFirebase();
    const t = useTranslations('profile');
    const [selectedSkills, setSelectedSkills] = React.useState<string[]>(initialSkills);
    const [newSkillRequest, setNewSkillRequest] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSkillChange = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    const handleSave = async () => {
        if (!userId || !db) return;
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { 'professionalProfile.skills': selectedSkills });
        onSave(selectedSkills);
        setIsOpen(false);
    }

    const handleRequestSkill = () => {
        if (newSkillRequest.trim()) {
            toast({
                title: t('skillRequestSubmitted'),
                description: t('skillRequestSubmittedDesc', { skill: newSkillRequest }),
            });
            setNewSkillRequest('');
        }
    }

    return (
        <div>
            <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-2">
                    {initialSkills.length > 0 ? (
                        initialSkills.map(skill => (
                            <Badge key={skill} variant="secondary" className="capitalize">{skill}</Badge>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('noSkillsYet')}</p>
                    )}
                </div>
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium leading-none">{t('editSkills')}</h4>
                                <p className="text-sm text-muted-foreground">{t('editSkillsDesc')}</p>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {allSkills.map(skill => (
                                    <div key={skill} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`skill-${skill}`}
                                            checked={selectedSkills.includes(skill)}
                                            onCheckedChange={() => handleSkillChange(skill)}
                                        />
                                        <Label htmlFor={`skill-${skill}`} className="capitalize font-normal cursor-pointer">{skill}</Label>
                                    </div>
                                ))}
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-medium leading-none mb-2">{t('requestNewSkill')}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{t('requestSkillDesc')}</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t('requestSkillPlaceholder')}
                                        value={newSkillRequest}
                                        onChange={(e) => setNewSkillRequest(e.target.value)}
                                    />
                                    <Button variant="secondary" onClick={handleRequestSkill} disabled={!newSkillRequest.trim()}>{t('request')}</Button>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
                                <Button onClick={handleSave}>{t('saveChanges')}</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}

function CompletedJobsStat() {
    const { user, role } = useUser();
    const { db } = useFirebase();
    const t = useTranslations('profile');
    const [jobsCompletedCount, setJobsCompletedCount] = React.useState(0);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        if (!user || role !== 'Professional' || !db) {
            setLoading(false);
            return;
        }
        const fetchJobsData = async () => {
            setLoading(true);
            const q = query(
                collection(db, 'jobs'),
                where('status', '==', 'Completed'),
                where('awardedProfessional', '==', doc(db, 'users', user.id))
            );
            const querySnapshot = await getDocs(q);
            setJobsCompletedCount(querySnapshot.size);
            setLoading(false);
        };
        fetchJobsData();
    }, [user, role, db]);

    return (
        <Link href="/dashboard/my-bids?status=Completed" className="block p-6 rounded-xl border border-border/50 bg-background/50 shadow-sm hover:bg-accent/50 hover:border-border transition-all flex flex-col items-center justify-center group text-center mt-2 lg:mt-0">
            <div className="p-3 bg-primary/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <Briefcase className="h-6 w-6 text-primary" />
            </div>
            {loading ? (
                <Skeleton className="h-8 w-1/2 mx-auto" />
            ) : (
                <p className="text-3xl font-extrabold">{jobsCompletedCount}</p>
            )}
            <p className="text-sm font-medium text-muted-foreground mt-1">{t('jobsCompleted')}</p>
        </Link>
    );
}

const beneficiarySchema = z.object({
    accountHolderName: z.string().min(3, "Account holder name is required."),
    accountNumber: z.string().min(9, "Enter a valid account number.").max(18),
    ifsc: z.string().length(11, "IFSC code must be 11 characters."),
});


function PayoutsCard({ user, onUpdate }: { user: User, onUpdate: () => void }) {
    const { toast } = useToast();
    const t = useTranslations('profile');
    const [isLoading, setIsLoading] = React.useState(false);

    const form = useForm<z.infer<typeof beneficiarySchema>>({
        resolver: zodResolver(beneficiarySchema),
        defaultValues: {
            accountHolderName: user.payouts?.accountHolderName || "",
            accountNumber: "",
            ifsc: user.payouts?.ifsc || "",
        },
    });

    async function onSubmit(values: z.infer<typeof beneficiarySchema>) {
        setIsLoading(true);
        try {
            // @ts-ignore
            const token = await user.getIdToken();
            const response = await fetch('/api/cashfree/payouts/add-beneficiary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    ...values,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to add beneficiary");
            }

            toast({
                title: t('bankAccountAdded'),
                description: t('bankAccountAddedDesc'),
                variant: "default",
            });
            onUpdate(); // This will re-fetch user data
        } catch (error: any) {
            toast({
                title: t('failedToAddBank'),
                description: error.message || t('unexpectedError'),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight"><Banknote className="h-5 w-5 text-primary" /> {t('payoutSettings')}</CardTitle>
                <CardDescription>{t('payoutSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                {user.payouts?.beneficiaryId ? (
                    <div className="space-y-4">
                        <div className="flex items-start justify-between rounded-lg border p-4 bg-secondary">
                            <div>
                                <p className="font-semibold">{user.payouts.accountHolderName}</p>
                                <p className="text-sm text-muted-foreground">{user.payouts.accountNumberMasked}</p>
                                <p className="text-sm text-muted-foreground font-mono">{user.payouts.ifsc}</p>
                            </div>
                            <Badge variant="success" className="gap-2"><Check className="h-4 w-4" /> {t('registered')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('changeAccountNote')}</p>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="accountHolderName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('accountHolderName')}</FormLabel>
                                        <FormControl><Input placeholder={t('accountHolderPlaceholder')} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="accountNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('bankAccountNumber')}</FormLabel>
                                            <FormControl><Input placeholder={t('accountNumberPlaceholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ifsc"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('ifscCode')}</FormLabel>
                                            <FormControl><Input placeholder={t('ifscPlaceholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveBankAccount')}
                            </Button>
                        </form>
                    </Form>
                )}
            </CardContent>
        </Card>
    )
}

function ReferralCard({ user }: { user: User }) {
    const { toast } = useToast();
    const t = useTranslations('profile');
    const [origin, setOrigin] = React.useState("");

    React.useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const referralLink = `${origin}/login?tab=signup&ref=${user.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        toast({
            title: t('linkCopied'),
            description: t('shareLinkDesc'),
        });
    };

    return (
        <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/20 shadow-2xl rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-indigo-900 text-xl font-bold tracking-tight">
                    <Gift className="h-5 w-5 text-indigo-600" />
                    {t('inviteAndEarn')}
                </CardTitle>
                <CardDescription className="text-indigo-700/80">
                    {t('inviteAndEarnDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="bg-white/50 border-indigo-200 text-indigo-900" />
                    <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0 border-indigo-200 hover:bg-white hover:text-indigo-700">
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>

    );
}

const emergencyContactSchema = z.object({
    name: z.string().min(2, "Name is required"),
    relation: z.string().min(2, "Relationship is required"),
    mobile: z.string().regex(/^[0-9]{10}$/, "Must be a valid 10-digit mobile number"),
});

function EmergencyContactsCard({ user, onUpdate }: { user: User, onUpdate: () => void }) {
    const { toast } = useToast();
    const { db } = useFirebase();
    const t = useTranslations('profile');
    const [isAdding, setIsAdding] = React.useState(false);

    const form = useForm<z.infer<typeof emergencyContactSchema>>({
        resolver: zodResolver(emergencyContactSchema),
        defaultValues: { name: "", relation: "", mobile: "" }
    });

    const handleAddContact = async (values: z.infer<typeof emergencyContactSchema>) => {
        if (!db) return;
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                emergencyContacts: arrayUnion(values)
            });
            toast({ title: t('contactAdded'), description: t('contactAddedDesc', { name: values.name }) });
            setIsAdding(false);
            form.reset();
            onUpdate();
        } catch (error) {
            toast({ title: t('error'), description: t('couldNotAddContact'), variant: "destructive" });
        }
    };

    const handleRemoveContact = async (contact: any) => {
        if (!db) return;
        try {
            // Firestore arrayRemove requires exact object match
            const userRef = doc(db, 'users', user.id);
            // We need to read current array first to filter (safer than arrayRemove with object)
            // But arrayRemove works if object is identical. Let's try filter approach for safety if we had ID, but here we use value.
            // Actually, for simplicity in this UI, let's just use arrayRemove
            const { arrayRemove } = await import("firebase/firestore"); // Lazy load
            await updateDoc(userRef, {
                emergencyContacts: arrayRemove(contact)
            });
            toast({ title: t('contactRemoved'), description: t('emergencyContactDeleted') });
            onUpdate();
        } catch (error) {
            toast({ title: t('error'), description: t('couldNotRemoveContact'), variant: "destructive" });
        }
    }

    return (
        <Card className="border-red-200/20 bg-red-500/5 shadow-2xl rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-red-900 text-xl font-bold tracking-tight">
                    <ShieldCheck className="h-5 w-5 text-red-600" />
                    {t('emergencyContacts')}
                </CardTitle>
                <CardDescription className="text-red-800/70">
                    {t('emergencyContactsDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {user.emergencyContacts && user.emergencyContacts.length > 0 ? (
                    <div className="grid gap-3">
                        {user.emergencyContacts.map((contact, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                                <div>
                                    <p className="font-medium text-sm">{contact.name} <span className="text-muted-foreground text-xs">({contact.relation})</span></p>
                                    <p className="text-xs text-muted-foreground font-mono">{contact.mobile}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveContact(contact)} className="h-10 px-4 text-red-500 hover:text-red-700 hover:bg-red-50">
                                    {t('remove')}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">{t('noEmergencyContactsYet')}</p>
                )}

                {isAdding ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAddContact)} className="space-y-3 p-3 border rounded-md bg-white">
                            <h4 className="text-sm font-semibold">{t('newContact')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <FormField name="name" control={form.control} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('name')} {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="relation" control={form.control} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('relationPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="mobile" control={form.control} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('mobilePlaceholder')} type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>{t('cancel')}</Button>
                                <Button type="submit" size="sm">{t('saveContact')}</Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="w-full h-12 border-dashed text-muted-foreground hover:text-foreground">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        {t('addEmergencyContact')}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function DeleteAccountCard({ user }: { user: User }) {
    const { toast } = useToast();
    const { db, auth } = useFirebase();
    const router = useRouter();
    const t = useTranslations('profile');
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [confirmText, setConfirmText] = React.useState("");

    const handleDelete = async () => {
        if (!db || !auth || !auth.currentUser) return;

        if (confirmText !== "DELETE") {
            toast({ title: t('verificationFailed'), description: t('typeDeleteToConfirm'), variant: "destructive" });
            return;
        }

        setIsDeleting(true);
        try {
            // 1. Delete Firestore Data (or mark deleted)
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                status: 'deleted',
                deletedAt: serverTimestamp(),
                email: `deleted_${user.id}@example.com`,
                name: 'Deleted User',
                phone: null,
                avatarUrl: null
            });

            // 2. Delete Auth User
            await deleteUser(auth.currentUser);

            toast({ title: t('accountDeleted'), description: t('accountDeletedDesc') });
            window.location.href = '/'; // Force reload/redirect
        } catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
                toast({
                    title: t('securityCheckRequired'),
                    description: t('securityCheckRequiredDesc'),
                    variant: "destructive"
                });
            } else {
                toast({
                    title: t('deletionFailed'),
                    description: t('deletionFailedDesc'),
                    variant: "destructive"
                });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="border-red-200/20 bg-red-500/5 shadow-2xl rounded-[2.5rem] overflow-hidden backdrop-blur-xl mt-8">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xl font-bold tracking-tight">
                    <AlertTriangle className="h-5 w-5" />
                    {t('dangerZone')}
                </CardTitle>
                <CardDescription className="text-red-600/80 dark:text-red-400/80">
                    {t('dangerZoneDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-300">{t('deleteAccount')}</h4>
                    <p className="text-sm text-red-700 dark:text-red-400">
                        {t('deleteAccountDesc')}
                    </p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">{t('deleteAccount')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('areYouAbsolutelySure')}</DialogTitle>
                            <DialogDescription>
                                {t('deleteConfirmationDesc')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="confirm-delete">{t('typeDeleteToConfirmLabel')}</Label>
                            <Input
                                id="confirm-delete"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="mt-2"
                                placeholder="DELETE"
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="secondary">{t('cancel')}</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting || confirmText !== "DELETE"}
                            >
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('confirmDeletion')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

export default function ProfileClient() {
    const { user, role, setUser, setRole, loading: userLoading } = useUser();
    const { db } = useFirebase();
    const [isReputationOpen, setIsReputationOpen] = React.useState(false);
    const { toast } = useToast();
    const { setHelp } = useHelp();
    const router = useRouter();
    const t = useTranslations('profile');

    const fetchUser = useCallback(async () => {
        if (!user) return;
        try {
            // @ts-ignore
            const token = await user.getIdToken();
            const response = await fetch('/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user && setUser) {
                    setUser(data.user);
                }
            }
        } catch (error) {
            // Failed to fetch profile
        }
    }, [user, setUser]);

    React.useEffect(() => {
        setHelp({
            title: t('yourProfile'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('profileHelpDesc1')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">{t('yourDetails')}:</span> {t('yourDetailsHelp')}</li>
                        <li><span className="font-semibold">{t('roleSwitching')}:</span> {t('roleSwitchingHelp')}</li>
                        {role === 'Professional' && (
                            <>
                                <li><span className="font-semibold">{t('ProfessionalReputation')}:</span> {t('ProfessionalReputationHelp')}</li>
                                <li><span className="font-semibold">{t('skills')}:</span> {t('skillsHelp')}</li>
                                <li><span className="font-semibold">{t('payoutSettings')}:</span> {t('payoutSettingsHelp')}</li>
                            </>
                        )}
                        <li><span className="font-semibold">{t('becomeProfessionalclient')}:</span> {t('becomeProfessionalclientHelp')}</li>
                    </ul>
                </div>
            )
        });
    }, [setHelp, role, t]);

    if (userLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('loadingProfile')}</span>
                </div>
            </div>
        );
    }

    if (!user || !db) {
        return <div>{t('userNotFound')}</div>
    }

    const professionalProfile = user.professionalProfile;
    const isclientOnly = user.roles.length === 1 && user.roles[0] === "Client";
    const isProfessionalOnly = user.roles.length === 1 && user.roles[0] === "Professional";

    const currentTierInfo = professionalProfile ? tierData[professionalProfile.tier] : null;
    const progressPercentage = currentTierInfo && professionalProfile ? ((professionalProfile.points - currentTierInfo.points) / (currentTierInfo.goal - currentTierInfo.points)) * 100 : 0;

    const handleProfileSave = (values: z.infer<typeof editProfileSchema>) => {
        if (setUser) {
            setUser(prevUser => {
                if (!prevUser) return null;
                return {
                    ...prevUser,
                    name: values.name,
                    pincodes: {
                        residential: values.residentialPincode,
                        office: values.officePincode || prevUser.pincodes?.office || '',
                    },
                    gstin: values.gstin || prevUser.gstin,
                };
            });
        }
    };

    const handleSkillsSave = (newSkills: string[]) => {
        if (setUser) {
            setUser(prevUser => {
                if (!prevUser || !prevUser.professionalProfile) return prevUser;
                const updatedProfile = { ...prevUser.professionalProfile, skills: newSkills };
                return { ...prevUser, professionalProfile: updatedProfile };
            });
            toast({
                title: t('skillsUpdated'),
                description: t('skillsUpdatedDesc'),
            });
        }
    }

    const handleBecomeclient = async () => {
        if (setUser && setRole && user && db) {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { roles: arrayUnion('Client') });
            const updatedUser = { ...user, roles: [...user.roles, 'Client'] as User['roles'] };
            setUser(updatedUser);
            setRole('Client');
            toast({
                title: t('clientRoleActivated'),
                description: t('clientRoleActivatedDesc'),
                variant: "default",
            });
        }
    };

    const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid gap-8 max-w-full overflow-x-hidden px-4 mb-12 font-sans selection:bg-blue-500 selection:text-white bg-surface dark:bg-slate-950 text-on-surface min-h-screen pt-8 pb-16"
        >
            <Card className="border-none shadow-xl shadow-black/5 bg-surface-container-low dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-primary via-primary/50 to-accent" />
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                            <AvatarImage src={user.realAvatarUrl} alt={user.name} />
                            <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                                {user.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-3xl font-extrabold tracking-tight">{user.name}</CardTitle>
                            </div>
                            <div className="flex flex-col mt-1">
                                <p className="text-muted-foreground">{user.email}</p>
                                <p className="text-sm text-muted-foreground font-mono truncate max-w-sm">{user.id}</p>
                                {(user as any).bio && (
                                    <p className="mt-2 text-sm italic text-foreground/80 max-w-md">&quot;{(user as any).bio}&quot;</p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>Member since {format(toDate(user.memberSince), 'MMMM yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{user.pincodes?.residential || 'N/A'} (Home)</span>
                                </div>
                                {user.pincodes?.office && (
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4" />
                                        <span>{user.pincodes.office} (Office)</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button className="font-semibold shadow-sm hover:-translate-y-0.5 transition-transform">{t('editProfileBtn')}</Button>
                                    </DialogTrigger>
                                    <EditProfileForm user={user} onSave={handleProfileSave} />
                                </Dialog>
                            </div>
                        </div>
                        {isSubscribed && (
                            <div className="text-right">
                                <p className="font-semibold">{user.subscription?.planName}</p>
                                <p className="text-sm text-muted-foreground">Expires: {user.subscription?.expiresAt ? format(toDate(user.subscription.expiresAt), "MMM d, yyyy") : 'N/A'}</p>
                            </div>
                        )}
                    </div>
                </CardHeader>
            </Card>
            
            {role === "Professional" && professionalProfile && (
                <div className="grid gap-8">
                    <Card className="border-none shadow-xl shadow-black/5 bg-surface-container-low dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-2xl font-bold tracking-tight">{t('ProfessionalReputation')}</CardTitle>
                            <CardDescription className="text-base">{t('ProfessionalReputationDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <Collapsible
                                open={isReputationOpen}
                                onOpenChange={setIsReputationOpen}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between p-5 rounded-xl bg-accent/10 border border-accent/20 cursor-pointer hover:bg-accent/20 transition-all duration-200">
                                        <div className="flex items-center gap-4">
                                            {tierIcons[professionalProfile.tier]}
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('tier')}</p>
                                                <p className="text-2xl font-extrabold">{professionalProfile.tier}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('reputationPoints')}</p>
                                                <p className="text-2xl font-extrabold text-right text-primary">{professionalProfile.points}</p>
                                            </div>
                                            <div className="bg-background p-2 rounded-full shadow-sm">
                                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-6 pt-6">
                                    <div className="text-sm text-muted-foreground p-4 border rounded-lg space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">{t('howReputationWorks')}</h4>
                                            <p>{t('howReputationWorksDesc')}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">{t('pointSystem')}</h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li><span className="font-semibold">{t('completeJobPoints')}:</span> +50 points</li>
                                                <li><span className="font-semibold">{t('fiveStarRatingPoints')}:</span> +20 points</li>
                                                <li><span className="font-semibold">{t('fourStarRatingPoints')}:</span> +10 points</li>
                                                <li><span className="font-semibold">{t('onTimeBonusPoints')}:</span> +15 points</li>
                                                <li><span className="font-semibold">{t('negativePoints')}:</span> -25 points</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">{t('reputationTiers')}</h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li><span className="font-semibold">Bronze:</span> 0 - 499 points</li>
                                                <li><span className="font-semibold">Silver:</span> 500 - 999 points</li>
                                                <li><span className="font-semibold">Gold:</span> 1000 - 1999 points</li>
                                                <li><span className="font-semibold">Platinum:</span> 2000+ points</li>
                                            </ul>
                                        </div>
                                    </div>
                                    {currentTierInfo && currentTierInfo.next !== 'Max' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-sm font-medium">{t('progressTo', { tier: currentTierInfo.next })}</p>
                                                <p className="text-sm font-medium">{professionalProfile.points} / {currentTierInfo.goal} pts</p>
                                            </div>
                                            <Progress value={progressPercentage} className="h-2" />
                                        </div>
                                    )}
                                    {professionalProfile.reputationHistory && professionalProfile.reputationHistory.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5" />
                                                    {t('reputationHistory')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ChartContainer config={chartConfig} className="h-64 w-full">
                                                    <AreaChart data={professionalProfile.reputationHistory} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
                                                        <CartesianGrid vertical={false} />
                                                        <XAxis
                                                            dataKey="month"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                        />
                                                        <YAxis
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                        />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Area
                                                            dataKey="points"
                                                            type="natural"
                                                            fill="var(--color-points)"
                                                            fillOpacity={0.4}
                                                            stroke="var(--color-points)"
                                                        />
                                                    </AreaChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>


                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center mt-2">
                                <div className="p-6 rounded-xl border border-border/50 bg-background/50 shadow-sm flex flex-col items-center justify-center">
                                    <div className="p-3 bg-primary/10 rounded-full mb-3">
                                        <Star className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-3xl font-extrabold">{professionalProfile.rating}/5.0</p>
                                    <p className="text-sm font-medium text-muted-foreground mt-1">{t('fromReviews', { count: professionalProfile.reviews })}</p>
                                </div>
                                <CompletedJobsStat />
                                <div className="p-6 rounded-xl border border-border/50 bg-background/50 shadow-sm flex flex-col items-center justify-center">
                                    <div className="p-3 bg-success/10 rounded-full mb-3">
                                        <ShieldCheck className="h-6 w-6 text-success" />
                                    </div>
                                    <p className="text-2xl font-bold">{professionalProfile.verified ? "Verified" : "Pending"}</p>
                                    <p className="text-sm font-medium text-muted-foreground mt-1">{t('verifiedStatus')}</p>
                                </div>
                                <div className="p-6 rounded-xl border border-border/50 bg-background/50 shadow-sm flex flex-col items-center justify-center">
                                    <div className="p-3 bg-secondary rounded-full mb-3">
                                        <Briefcase className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-3xl font-extrabold">{professionalProfile.skills.length}</p>
                                    <p className="text-sm font-medium text-muted-foreground mt-1">{t('skillsLabel')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="border-none shadow-xl shadow-black/5 bg-surface-container-low dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-bold tracking-tight">{t('mySkills')}</CardTitle>
                                <CardDescription>{t('mySkillsDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SkillsEditor initialSkills={professionalProfile.skills} onSave={handleSkillsSave} userId={user.id} />
                            </CardContent>
                        </Card>
                        <PayoutsCard user={user} onUpdate={fetchUser} />
                    </div>

                    {/* Phase 21: Emergency Contacts */}
                    <EmergencyContactsCard user={user} onUpdate={fetchUser} />

                </div>
            )}

            {user && <ReferralCard user={user} />}

            {isclientOnly && (
                <Card className="bg-surface-container dark:bg-slate-900 border-dashed">
                    <CardHeader>
                        <CardTitle>{t('expandOpportunities')}</CardTitle>
                        <CardDescription>{t('expandOpportunitiesDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/verify-professional">
                                {t('becomeProfessional')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isProfessionalOnly && (
                <Card className="bg-surface-container dark:bg-slate-900 border-dashed">
                    <CardHeader>
                        <CardTitle>{t('readyToHire')}</CardTitle>
                        <CardDescription>{t('readyToHireDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleBecomeclient}>
                            {t('startHiring')} <PlusCircle className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            <DeleteAccountCard user={user} />
        </motion.div>
    );
}
