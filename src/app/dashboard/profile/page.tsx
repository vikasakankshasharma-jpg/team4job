
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
import { Gem, Medal, Star, ShieldCheck, Briefcase } from "lucide-react";

const tierIcons = {
  Bronze: <Medal className="h-6 w-6 text-yellow-700" />,
  Silver: <Medal className="h-6 w-6 text-gray-400" />,
  Gold: <Gem className="h-6 w-6 text-amber-500" />,
  Platinum: <Gem className="h-6 w-6 text-cyan-400" />,
};

export default function ProfilePage() {
  const { user, role } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }
  
  const installerProfile = user.installerProfile;

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person face" />
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
                <Button>Edit Profile</Button>
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
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/20">
                    <div className="flex items-center gap-4">
                        {tierIcons[installerProfile.tier]}
                        <div>
                            <p className="text-sm">Tier</p>
                            <p className="text-xl font-bold">{installerProfile.tier}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-right">Reputation Points</p>
                        <p className="text-xl font-bold text-right">{installerProfile.points}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-lg border">
                        <Star className="mx-auto h-6 w-6 mb-2 text-primary"/>
                        <p className="text-2xl font-bold">{installerProfile.rating}/5.0</p>
                        <p className="text-sm text-muted-foreground">from {installerProfile.reviews} reviews</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <Briefcase className="mx-auto h-6 w-6 mb-2 text-primary"/>
                        <p className="text-2xl font-bold">{installerProfile.jobsCompleted}</p>
                        <p className="text-sm text-muted-foreground">Jobs Completed</p>
                    </div>
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
