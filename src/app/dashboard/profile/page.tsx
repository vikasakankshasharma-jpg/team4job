
"use client";

import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Gem, Medal, Star, ShieldCheck, Briefcase, ChevronsUpDown, TrendingUp, CalendarDays, ArrowRight, PlusCircle, MapPin, Building } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress";
import React from "react";
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Job, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { collection, doc, getDocs, updateDoc, where, query } from "firebase/firestore";
import { db } from "@/lib/firebase";


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

function EditProfileForm({ user, onSave }) {
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
        const updatedData = {
            name: values.name,
            pincodes: {
                residential: values.residentialPincode,
                office: values.officePincode || "",
            }
        };
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updatedData);
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
    skills: z.string().min(10, { message: "Please list at least one skill (min 10 characters)." }),
});


function InstallerOnboardingDialog({ user, onSave }) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof installerOnboardingSchema>>({
        resolver: zodResolver(installerOnboardingSchema),
        defaultValues: {
            pincode: user.pincodes.residential || "",
            skills: "",
        },
    });

    async function onSubmit(values: z.infer<typeof installerOnboardingSchema>) {
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
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Skills</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., IP Cameras, NVR Setup, Cabling, Access Control..." {...field} />
                                </FormControl>
                                <FormDescription>Enter a comma-separated list of your technical skills.</FormDescription>
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

export default function ProfilePage() {
  const { user, role, setUser, setRole } = useUser();
  const [isReputationOpen, setIsReputationOpen] = React.useState(false);
  const { toast } = useToast();
  const [jobsCompletedCount, setJobsCompletedCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCompletedJobs = async () => {
      if (role !== 'Installer' || !user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const jobsQuery = query(collection(db, "jobs"), where("awardedInstaller", "==", user.id), where("status", "==", "Completed"));
      const querySnapshot = await getDocs(jobsQuery);
      setJobsCompletedCount(querySnapshot.size);
      setLoading(false);
    };
    fetchCompletedJobs();
  }, [user, role]);
  
  if (!user || loading) {
    return <div>Loading...</div>;
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

  const handleInstallerOnboarding = async (values: z.infer<typeof installerOnboardingSchema>) => {
    if (setUser && setRole && user) {
        const updatedData = {
          roles: [...user.roles, 'Installer'],
          'pincodes.residential': values.pincode,
          installerProfile: {
            tier: 'Bronze' as const,
            points: 0,
            skills: values.skills.split(',').map(s => s.trim()),
            rating: 0,
            reviews: 0,
            verified: user.installerProfile?.verified || false,
            reputationHistory: [],
          }
        };

        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updatedData);
        
        setUser(prev => prev ? ({ ...prev, ...updatedData }) : null);
        setRole('Installer');
    }
  };

  const handleBecomeJobGiver = async () => {
    if (setUser && setRole && user) {
        const updatedData = {
            roles: [...user.roles, 'Job Giver']
        };
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updatedData);
      
        setUser(prev => prev ? ({ ...prev, ...updatedData }) : null);
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
                <p className="text-sm text-muted-foreground">{user.anonymousId}</p>
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
          </div>
        </CardHeader>
      </Card>
      
      {role === "Installer" && installerProfile && (
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
                        {installerProfile.reputationHistory && (
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
                    <Link href="/dashboard/my-bids?status=Completed" className="block p-4 rounded-lg border hover:bg-accent transition-colors">
                        <Briefcase className="mx-auto h-6 w-6 mb-2 text-primary"/>
                        <p className="text-2xl font-bold">{jobsCompletedCount}</p>
                        <p className="text-sm text-muted-foreground">Jobs Completed</p>
                    </Link>
                </div>

                <div>
                    <h4 className="font-semibold mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {installerProfile.skills.map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
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
    </div>
  );
}
