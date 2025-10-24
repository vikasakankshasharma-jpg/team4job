
"use client";

import { useUser, useFirebase } from "@/hooks/use-user";
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
import { Gem, Medal, Star, ShieldCheck, Briefcase, ChevronsUpDown, TrendingUp, CalendarDays, ArrowRight, PlusCircle, MapPin, Building, Pencil, Check, Loader2, Ticket, Banknote } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { allSkills } from "@/lib/data";
import { User, Coupon, SubscriptionPlan } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useHelp } from "@/hooks/use-help";
import axios from "axios";


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
});

function EditProfileForm({ user, onSave }: { user: User, onSave: (values: any) => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const isInstaller = user.roles.includes('Installer');

    const form = useForm<z.infer<typeof editProfileSchema>>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            name: user.name || "",
            residentialPincode: user.pincodes.residential || "",
            officePincode: user.pincodes.office || "",
        },
    });

    async function onSubmit(values: z.infer<typeof editProfileSchema>) {
        if (!user || !db) return;
        const userRef = doc(db, 'users', user.id);
        const updateData = {
            name: values.name,
            'pincodes.residential': values.residentialPincode,
            'pincodes.office': values.officePincode || '',
        };
        await updateDoc(userRef, updateData);
        onSave(values);
        toast({
            title: "Profile Updated",
            description: "Your profile details have been successfully updated.",
        });
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
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
                                <FormLabel>Residential Pincode</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {isInstaller && (
                         <FormField
                            control={form.control}
                            name="officePincode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Office Pincode (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 110021" {...field} />
                                    </FormControl>
                                    <FormDescription>Add an office pincode to find jobs in that area too.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                             <Button type="submit">Save Changes</Button>
                        </DialogClose>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

const installerOnboardingSchema = z.object({
    pincode: z.string().regex(/^\d{6}$/, { message: "Must be a 6-digit Indian pincode." }),
    skills: z.array(z.string()).min(1, { message: "Please select at least one skill." }),
});


function InstallerOnboardingDialog({ user, onSave }: { user: User, onSave: (values: any) => void }) {
    const { toast } = useToast();
    const { db } = useFirebase();
    const form = useForm<z.infer<typeof installerOnboardingSchema>>({
        resolver: zodResolver(installerOnboardingSchema),
        defaultValues: {
            pincode: user.pincodes.residential || "",
            skills: [],
        },
    });

    async function onSubmit(values: z.infer<typeof installerOnboardingSchema>) {
        if (!user || !db) return;
        const userRef = doc(db, 'users', user.id);
        const updateData = {
            roles: arrayUnion('Installer'),
            'pincodes.residential': values.pincode,
            installerProfile: {
                tier: 'Bronze',
                points: 0,
                skills: values.skills,
                rating: 0,
                reviews: 0,
                verified: user.installerProfile?.verified || false,
                reputationHistory: [],
            }
        };
        await updateDoc(userRef, updateData);
        
        onSave(values);
        toast({
            title: "Installer Profile Created!",
            description: "You can now switch to your Installer role and start finding jobs.",
            variant: "success",
        });
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Become an Installer</DialogTitle>
                <DialogDescription>
                    Fill out your details below to start finding jobs on the platform.
                </DialogDescription>
            </DialogHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="pincode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Residential Pincode</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 110001" {...field} />
                                </FormControl>
                                <FormDescription>This helps us recommend jobs near you.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="skills"
                        render={() => (
                            <FormItem>
                                <FormLabel>Your Skills</FormLabel>
                                <div className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
                                    {allSkills.map((skill) => (
                                        <FormField
                                            key={skill}
                                            control={form.control}
                                            name="skills"
                                            render={({ field }) => {
                                                return (
                                                <FormItem
                                                    key={skill}
                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                >
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(skill)}
                                                        onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...(field.value || []), skill])
                                                            : field.onChange(
                                                                field.value?.filter(
                                                                (value) => value !== skill
                                                                )
                                                            )
                                                        }}
                                                    />
                                                    </FormControl>
                                                    <FormLabel className="font-normal capitalize cursor-pointer">
                                                        {skill}
                                                    </FormLabel>
                                                </FormItem>
                                                )
                                            }}
                                        />
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Create Installer Profile</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

function SkillsEditor({ initialSkills, onSave, userId }: { initialSkills: string[], onSave: (skills: string[]) => void, userId: string }) {
    const { toast } = useToast();
    const { db } = useFirebase();
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
        await updateDoc(userRef, { 'installerProfile.skills': selectedSkills });
        onSave(selectedSkills);
        setIsOpen(false);
    }
    
    const handleRequestSkill = () => {
        if (newSkillRequest.trim()) {
            toast({
                title: "Skill Request Submitted",
                description: `Your request for "${newSkillRequest}" has been sent for review.`,
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
                        <p className="text-sm text-muted-foreground">No skills added yet.</p>
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
                                <h4 className="font-medium leading-none">Edit Skills</h4>
                                <p className="text-sm text-muted-foreground">Select your areas of expertise.</p>
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
                                <h4 className="font-medium leading-none mb-2">Request New Skill</h4>
                                <p className="text-sm text-muted-foreground mb-2">Can't find your skill? Request it here.</p>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="e.g., AI Analytics" 
                                        value={newSkillRequest}
                                        onChange={(e) => setNewSkillRequest(e.target.value)}
                                    />
                                    <Button variant="secondary" onClick={handleRequestSkill} disabled={!newSkillRequest.trim()}>Request</Button>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}

function RedeemCouponCard({ user, role, onSubscriptionUpdate }: { user: User, role: 'Installer' | 'Job Giver', onSubscriptionUpdate: () => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [couponCode, setCouponCode] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    
    const handleRedeem = async () => {
        if (!couponCode.trim()) {
            toast({ title: "Please enter a coupon code.", variant: "destructive" });
            return;
        }
        if (!db || !user) return;
        setIsLoading(true);

        const couponRef = doc(db, "coupons", couponCode.toUpperCase());
        const couponSnap = await getDoc(couponRef);

        if (!couponSnap.exists()) {
            toast({ title: "Invalid Coupon Code", description: "The code you entered does not exist.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const coupon = couponSnap.data() as Coupon;
        const now = new Date();

        if (!coupon.isActive || toDate(coupon.validUntil) < now || toDate(coupon.validFrom) > now) {
            toast({ title: "Coupon Not Valid", description: "This coupon is either inactive or expired.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        
        if (coupon.applicableToRole !== 'Any' && coupon.applicableToRole !== role) {
            toast({ title: "Coupon Not Applicable", description: `This coupon is only valid for ${coupon.applicableToRole}s.`, variant: "destructive" });
            setIsLoading(false);
            return;
        }
        
        // All checks passed, update user subscription
        const userRef = doc(db, 'users', user.id);
        const currentExpiry = user.subscription && toDate(user.subscription.expiresAt) > now ? toDate(user.subscription.expiresAt) : now;
        const newExpiryDate = new Date(currentExpiry.setDate(currentExpiry.getDate() + coupon.durationDays));

        await updateDoc(userRef, {
            'subscription.planId': coupon.planId,
            'subscription.planName': coupon.description,
            'subscription.expiresAt': newExpiryDate
        });
        
        onSubscriptionUpdate();
        toast({
            title: "Coupon Redeemed!",
            description: `Your subscription has been extended by ${coupon.durationDays} days.`,
            variant: "success"
        });
        setCouponCode('');
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Redeem a Coupon</CardTitle>
                <CardDescription>Have a coupon code? Enter it here to extend your subscription or get premium features.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-2">
                    <Input
                        placeholder="Enter Coupon Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button onClick={handleRedeem} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Redeem
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function CompletedJobsStat() {
  const { user, role } = useUser();
  const { db } = useFirebase();
  const [jobsCompletedCount, setJobsCompletedCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!user || role !== 'Installer' || !db) {
      setLoading(false);
      return;
    }
    const fetchJobsData = async () => {
      setLoading(true);
      const q = query(
        collection(db, 'jobs'),
        where('status', '==', 'Completed'),
        where('awardedInstaller', '==', doc(db, 'users', user.id))
      );
      const querySnapshot = await getDocs(q);
      setJobsCompletedCount(querySnapshot.size);
      setLoading(false);
    };
    fetchJobsData();
  }, [user, role, db]);

  return (
    <Link href="/dashboard/my-bids?status=Completed" className="block p-4 rounded-lg border hover:bg-accent transition-colors">
      <Briefcase className="mx-auto h-6 w-6 mb-2 text-primary" />
      {loading ? (
        <Skeleton className="h-8 w-1/2 mx-auto" />
      ) : (
        <p className="text-2xl font-bold">{jobsCompletedCount}</p>
      )}
      <p className="text-sm text-muted-foreground">Jobs Completed</p>
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
            await axios.post('/api/cashfree/payouts/add-beneficiary', {
                userId: user.id,
                ...values,
            });
            toast({
                title: "Bank Account Added",
                description: "Your bank account has been successfully registered for payouts.",
                variant: "success",
            });
            onUpdate(); // This will re-fetch user data
        } catch (error: any) {
            console.error("Failed to add beneficiary:", error);
            toast({
                title: "Failed to Add Bank Account",
                description: error.response?.data?.error || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5"/> Payout Settings</CardTitle>
                <CardDescription>Manage the bank account where you receive payments for completed jobs.</CardDescription>
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
                            <Badge variant="success" className="gap-2"><Check className="h-4 w-4" /> Registered</Badge>
                         </div>
                         <p className="text-xs text-muted-foreground">To change your bank account, please contact support.</p>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                           <FormField
                              control={form.control}
                              name="accountHolderName"
                              render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Holder Name</FormLabel>
                                    <FormControl><Input placeholder="Name as per bank records" {...field} /></FormControl>
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
                                        <FormLabel>Bank Account Number</FormLabel>
                                        <FormControl><Input placeholder="Enter account number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                 <FormField
                                  control={form.control}
                                  name="ifsc"
                                  render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IFSC Code</FormLabel>
                                        <FormControl><Input placeholder="Enter 11-digit IFSC" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Bank Account
                            </Button>
                        </form>
                    </Form>
                )}
            </CardContent>
        </Card>
    )
}

export default function ProfilePage() {
  const { user, role, setUser, setRole, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [isReputationOpen, setIsReputationOpen] = React.useState(false);
  const { toast } = useToast();
  const { setHelp } = useHelp();

  const fetchUser = useCallback(async () => {
    if (!db || !user) return;
    const userDoc = await getDoc(doc(db, 'users', user.id));
    if (userDoc.exists() && setUser) {
      setUser({ id: userDoc.id, ...userDoc.data() } as User);
    }
  }, [db, user, setUser]);

  React.useEffect(() => {
    setHelp({
        title: "Your Profile",
        content: (
            <div className="space-y-4 text-sm">
                <p>This is your personal profile page. Here, you can view and manage your information.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Your Details:</span> View your name, user ID, email, and location info. Click "Edit Profile" to update your name or pincodes.</li>
                    <li><span className="font-semibold">Role Switching:</span> If you have both "Job Giver" and "Installer" roles, you can switch between them in the user menu (top right).</li>
                    {role === 'Installer' && (
                        <>
                         <li><span className="font-semibold">Installer Reputation:</span> This section tracks your performance. Complete jobs and get good ratings to earn points and advance to higher tiers (Bronze, Silver, Gold, Platinum).</li>
                         <li><span className="font-semibold">Skills:</span> Click the pencil icon to add or remove skills from your profile. This helps Job Givers find you.</li>
                         <li><span className="font-semibold">Payout Settings:</span> Add your bank account details here to receive payments for completed jobs.</li>
                        </>
                    )}
                    <li><span className="font-semibold">Become an Installer/Job Giver:</span> If you only have one role, you'll see a prompt to activate the other, expanding your opportunities on the platform.</li>
                </ul>
            </div>
        )
    });
  }, [setHelp, role]);

  const onSubscriptionUpdate = useCallback(async () => {
    if (!db || !user) return;
    const userDoc = await getDoc(doc(db, 'users', user.id));
    if (userDoc.exists() && setUser) {
      setUser({ id: userDoc.id, ...userDoc.data() } as User);
    }
  }, [db, user, setUser]);

  if (userLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Profile...</span>
        </div>
      </div>
    );
  }

  if (!user || !db) {
    return <div>User not found.</div>
  }
  
  const installerProfile = user.installerProfile;
  const isJobGiverOnly = user.roles.length === 1 && user.roles[0] === "Job Giver";
  const isInstallerOnly = user.roles.length === 1 && user.roles[0] === "Installer";

  const currentTierInfo = installerProfile ? tierData[installerProfile.tier] : null;
  const progressPercentage = currentTierInfo && installerProfile ? ((installerProfile.points - currentTierInfo.points) / (currentTierInfo.goal - currentTierInfo.points)) * 100 : 0;

  const handleProfileSave = (values: z.infer<typeof editProfileSchema>) => {
    if(setUser) {
      setUser(prevUser => {
        if (!prevUser) return null;
        return { 
            ...prevUser, 
            name: values.name,
            pincodes: {
                residential: values.residentialPincode,
                office: values.officePincode || prevUser.pincodes.office,
            }
        };
      });
    }
  };
  
  const handleSkillsSave = (newSkills: string[]) => {
    if (setUser) {
        setUser(prevUser => {
            if (!prevUser || !prevUser.installerProfile) return prevUser;
            const updatedProfile = { ...prevUser.installerProfile, skills: newSkills };
            return { ...prevUser, installerProfile: updatedProfile };
        });
        toast({
            title: "Skills Updated",
            description: "Your list of skills has been saved.",
        });
    }
  }

  const handleInstallerOnboarding = (values: z.infer<typeof installerOnboardingSchema>) => {
    if (setUser && setRole && user) {
        const updatedUser: User = {
          ...user,
          roles: [...user.roles, 'Installer'] as User['roles'],
          pincodes: { ...user.pincodes, residential: values.pincode },
          installerProfile: {
            tier: 'Bronze' as const,
            points: 0,
            skills: values.skills,
            rating: 0,
            reviews: 0,
            verified: user.installerProfile?.verified || false,
          }
        };
        setUser(updatedUser);
        setRole('Installer');
    }
  };

  const handleBecomeJobGiver = async () => {
    if (setUser && setRole && user && db) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { roles: arrayUnion('Job Giver') });
        const updatedUser = { ...user, roles: [...user.roles, 'Job Giver'] as User['roles'] };
        setUser(updatedUser);
        setRole('Job Giver');
        toast({
            title: "Job Giver Role Activated!",
            description: "You can now post jobs and hire installers.",
            variant: "success",
        });
    }
  };
  

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={user.realAvatarUrl} alt={user.name} />
              <AvatarFallback className="text-3xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <CardTitle className="text-3xl">{user.name}</CardTitle>
                {installerProfile?.verified && (
                    <Badge variant="secondary" className="gap-1 pl-2">
                        <ShieldCheck className="h-4 w-4 text-green-600"/> Verified
                    </Badge>
                )}
              </div>
               <div className="flex flex-col mt-1">
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground font-mono truncate max-w-sm">{user.id}</p>
              </div>

               <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Member since {format(toDate(user.memberSince), 'MMMM yyyy')}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{user.pincodes.residential} (Home)</span>
                </div>
                 {user.pincodes.office && (
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{user.pincodes.office} (Office)</span>
                    </div>
                 )}
              </div>

              <div className="mt-4">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Edit Profile</Button>
                    </DialogTrigger>
                    <EditProfileForm user={user} onSave={handleProfileSave} />
                </Dialog>
              </div>
            </div>
            {user.subscription && (
                 <div className="text-right">
                    <p className="font-semibold">{user.subscription.planName}</p>
                    <p className="text-sm text-muted-foreground">Expires: {format(toDate(user.subscription.expiresAt), "MMM d, yyyy")}</p>
                 </div>
            )}
          </div>
        </CardHeader>
      </Card>
      
      {role === "Installer" && installerProfile && (
        <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Installer Reputation</CardTitle>
                    <CardDescription>Your performance and trust score on the platform.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                     <Collapsible
                        open={isReputationOpen}
                        onOpenChange={setIsReputationOpen}
                     >
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    {tierIcons[installerProfile.tier]}
                                    <div>
                                        <p className="text-sm">Tier</p>
                                        <p className="text-xl font-bold">{installerProfile.tier}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm">Reputation Points</p>
                                        <p className="text-xl font-bold text-right">{installerProfile.points}</p>
                                    </div>
                                    <ChevronsUpDown className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-6 pt-6">
                            <div className="text-sm text-muted-foreground p-4 border rounded-lg space-y-4">
                               <div>
                                    <h4 className="font-semibold text-foreground mb-2">How Reputation Works</h4>
                                    <p>Earn points for completing jobs and receiving positive ratings. Higher points unlock new tiers, giving you more visibility and access to premium jobs.</p>
                               </div>
                               <div>
                                    <h4 className="font-semibold text-foreground mb-2">Point System</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                       <li><span className="font-semibold">Complete a Job:</span> +50 points</li>
                                       <li><span className="font-semibold">Receive a 5-Star Rating:</span> +20 points</li>
                                       <li><span className="font-semibold">Receive a 4-Star Rating:</span> +10 points</li>
                                       <li><span className="font-semibold">On-time Completion Bonus:</span> +15 points</li>
                                       <li><span className="font-semibold">Job Canceled or 1-Star Rating:</span> -25 points</li>
                                    </ul>
                               </div>
                               <div>
                                    <h4 className="font-semibold text-foreground mb-2">Reputation Tiers</h4>
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
                                        <p className="text-sm font-medium">Progress to {currentTierInfo.next}</p>
                                        <p className="text-sm font-medium">{installerProfile.points} / {currentTierInfo.goal} pts</p>
                                    </div>
                                    <Progress value={progressPercentage} className="h-2"/>
                                 </div>
                            )}
                            {installerProfile.reputationHistory && installerProfile.reputationHistory.length > 0 && (
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5" />
                                            Reputation History (Last 6 Months)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-64 w-full">
                                            <AreaChart data={installerProfile.reputationHistory} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
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


                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                        <div className="p-4 rounded-lg border">
                            <Star className="mx-auto h-6 w-6 mb-2 text-primary"/>
                            <p className="text-2xl font-bold">{installerProfile.rating}/5.0</p>
                            <p className="text-sm text-muted-foreground">from {installerProfile.reviews} reviews</p>
                        </div>
                        <CompletedJobsStat />
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">Skills</h4>
                        <SkillsEditor initialSkills={installerProfile.skills} onSave={handleSkillsSave} userId={user.id}/>
                    </div>
                </CardContent>
            </Card>
            <PayoutsCard user={user} onUpdate={fetchUser} />
        </div>
      )}

      {isJobGiverOnly && (
         <Card className="bg-accent/20 border-dashed">
            <CardHeader>
                <CardTitle>Expand Your Opportunities</CardTitle>
                <CardDescription>Want to find work on the platform? Create an installer profile to start bidding on jobs.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            Become an Installer <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <InstallerOnboardingDialog user={user} onSave={handleInstallerOnboarding} />
                </Dialog>
            </CardContent>
         </Card>
      )}

       {isInstallerOnly && (
         <Card className="bg-accent/20 border-dashed">
            <CardHeader>
                <CardTitle>Ready to Hire?</CardTitle>
                <CardDescription>Activate your Job Giver profile to post jobs and find the perfect installer for your projects.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleBecomeJobGiver}>
                    Start Hiring as a Job Giver <PlusCircle className="ml-2 h-4 w-4" />
                </Button>
            </CardContent>
         </Card>
      )}

      <RedeemCouponCard user={user} role={role as 'Installer' | 'Job Giver'} onSubscriptionUpdate={onSubscriptionUpdate} />

    </div>
  );
}
