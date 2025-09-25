
"use client";

import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Gem, Medal, Star, ShieldCheck, Briefcase, ChevronsUpDown, TrendingUp } from "lucide-react";
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
import { jobs } from "@/lib/data";


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

function EditProfileForm({ user, onSave }) {
    const [name, setName] = React.useState(user.name);
    const { toast } = useToast();

    const handleSave = () => {
        onSave(name);
        toast({
            title: "Profile Updated",
            description: "Your name has been successfully updated.",
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
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                        Name
                    </Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                        Email
                    </Label>
                    <Input id="email" value={user.email} className="col-span-3" disabled />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                 <DialogClose asChild>
                    <Button onClick={handleSave}>Save Changes</Button>
                 </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}

export default function ProfilePage() {
  const { user, role, setUser } = useUser(); // Using a mock setUser for demo
  const [isReputationOpen, setIsReputationOpen] = React.useState(false);
  
  const jobsCompleted = React.useMemo(() => {
    if (role !== 'Installer' || !user) return 0;
    return jobs.filter(job => job.status === 'Completed' && job.awardedInstaller === user.id).length;
  }, [user, role]);
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  const installerProfile = user.installerProfile;


  const currentTierInfo = installerProfile ? tierData[installerProfile.tier] : null;
  const progressPercentage = currentTierInfo && installerProfile ? ((installerProfile.points - currentTierInfo.points) / (currentTierInfo.goal - currentTierInfo.points)) * 100 : 0;

  const handleProfileSave = (newName: string) => {
    // In a real app, you'd call an API. Here, we just update the context state.
    if(setUser) {
      setUser(prevUser => prevUser ? ({ ...prevUser, name: newName }) : null);
    }
  };


  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AnimatedAvatar svg={user.avatarUrl} />
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
              <p className="mt-1">{user.email}</p>
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
                        <p className="text-2xl font-bold">{jobsCompleted}</p>
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
    </div>
  );
}
