"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { User, PortfolioItem, Job } from "@/lib/types";
import { toDate } from "@/lib/utils";
import {
    Star,
    ShieldCheck,
    MapPin,
    Calendar,
    Briefcase,
    Heart,
    UserX,
    MessageSquare,
    Award,
    Clock,
    CheckCircle2,
    Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

function PortfolioThumbnail({ item }: { item: PortfolioItem }) {
    const [isError, setIsError] = useState(false);

    return (
        <div className="group relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity">
            {/* Placeholder for real image */}
            <div className="absolute inset-0 flex items-center justify-center bg-secondary text-secondary-foreground">
                <ImageIcon className="h-8 w-8 opacity-20" />
            </div>
            {!isError && (
                <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    onError={() => setIsError(true)}
                />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {item.title}
            </div>
        </div>
    );
}

interface InstallerProfileModalProps {
    installer: User;
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onUpdateAction?: (installerId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void;
    workHistory?: Job[]; // Jobs this installer has done for the current user
}

export function InstallerProfileModal({
    installer,
    isOpen,
    onClose,
    currentUser,
    onUpdateAction,
    workHistory = []
}: InstallerProfileModalProps) {
    const [activeTab, setActiveTab] = useState("about");

    if (!installer) return null;

    const isFavorite = currentUser?.favoriteInstallerIds?.includes(installer.id);
    const isBlocked = currentUser?.blockedInstallerIds?.includes(installer.id);

    const tierColor = {
        Bronze: "text-amber-700 bg-amber-100 border-amber-200",
        Silver: "text-slate-600 bg-slate-100 border-slate-200",
        Gold: "text-yellow-600 bg-yellow-100 border-yellow-200",
        Platinum: "text-cyan-600 bg-cyan-100 border-cyan-200",
    }[installer.installerProfile?.tier || "Bronze"];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                {/* Header Section */}
                <div className="p-6 pb-4 border-b">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <Avatar className="h-24 w-24 border-2 border-border">
                                <AnimatedAvatar svg={installer.realAvatarUrl} />
                                <AvatarFallback className="text-2xl">{installer.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        {installer.name}
                                        {installer.installerProfile?.verified && (
                                            <ShieldCheck className="h-5 w-5 text-green-600" />
                                        )}
                                    </DialogTitle>
                                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {installer.address?.cityPincode || "Location not set"}
                                    </p>
                                </div>

                                <Badge variant="outline" className={`px-3 py-1 text-sm font-medium border ${tierColor}`}>
                                    {installer.installerProfile?.tier || "Bronze"} Tier
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm mt-3">
                                <div className="flex items-center gap-1.5">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{installer.installerProfile?.rating.toFixed(1)}</span>
                                    <span className="text-muted-foreground">({installer.installerProfile?.reviews} reviews)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <span>{installer.installerProfile?.reviews || 0} jobs completed</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Member since {format(toDate(installer.memberSince), "MMM yyyy")}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-6">
                        <Button className="flex-1" onClick={() => { }}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contact Installer
                        </Button>

                        {onUpdateAction && (
                            <>
                                <Button
                                    variant={isFavorite ? "secondary" : "outline"}
                                    onClick={() => onUpdateAction(installer.id, isFavorite ? 'unfavorite' : 'favorite')}
                                    className={isFavorite ? "bg-red-50 text-red-600 hover:bg-red-100" : ""}
                                >
                                    <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                                    <span className="sr-only">Favorite</span>
                                </Button>

                                <Button
                                    variant={isBlocked ? "destructive" : "outline"}
                                    onClick={() => onUpdateAction(installer.id, isBlocked ? 'unblock' : 'block')}
                                >
                                    <UserX className="h-4 w-4" />
                                    <span className="sr-only">Block</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 border-b">
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                            <TabsTrigger
                                value="about"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
                            >
                                About & Skills
                            </TabsTrigger>
                            <TabsTrigger
                                value="portfolio"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
                            >
                                Portfolio
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
                            >
                                Work History {workHistory.length > 0 && `(${workHistory.length})`}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <TabsContent value="about" className="m-0 space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <UserX className="h-4 w-4" /> Bio
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {installer.installerProfile?.bio || "No bio provided yet."}
                                    </p>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <Award className="h-4 w-4" /> Specialties & Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {installer.installerProfile?.specialties?.map((spec) => (
                                            <Badge key={spec} variant="secondary" className="px-3 py-1">
                                                {spec}
                                            </Badge>
                                        ))}
                                        {installer.installerProfile?.skills?.map((skill) => (
                                            <Badge key={skill} variant="outline" className="px-3 py-1">
                                                {skill}
                                            </Badge>
                                        ))}
                                        {(!installer.installerProfile?.skills?.length && !installer.installerProfile?.specialties?.length) && (
                                            <span className="text-sm text-muted-foreground italic">No skills listed.</span>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> Availability
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {installer.installerProfile?.availability?.status === 'busy' ? (
                                            <Badge variant="destructive">Busy / Fully Booked</Badge>
                                        ) : installer.installerProfile?.availability?.status === 'on-vacation' ? (
                                            <Badge variant="secondary">On Vacation</Badge>
                                        ) : (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Available Now</Badge>
                                        )}

                                        {installer.installerProfile?.availability?.nextAvailable && (
                                            <span className="text-sm text-muted-foreground">
                                                Next available: {format(toDate(installer.installerProfile.availability.nextAvailable), "MMM d, yyyy")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="portfolio" className="m-0">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {installer.installerProfile?.portfolio?.map((item) => (
                                        <PortfolioThumbnail key={item.id} item={item} />
                                    )) || (
                                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed hover:bg-muted/50 transition-colors">
                                                <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                                                <p>No portfolio items uploaded yet.</p>
                                                <p className="text-xs">Ask this installer to upload some photos of their past work!</p>
                                            </div>
                                        )}
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="m-0 space-y-4">
                                {workHistory.length > 0 ? (
                                    workHistory.map(job => (
                                        <div key={job.id} className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                            <div>
                                                <h4 className="font-medium text-sm">{job.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                    <span>Completed on {format(toDate(job.completionTimestamp || job.postedAt), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline">{job.jobCategory}</Badge>
                                                <div className="mt-1 text-xs font-medium">₹{job.bids.find(b => b.installerId === installer.id)?.amount.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                                        <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No work history with this installer.</p>
                                        <p className="text-xs">Jobs completed for you by this installer will appear here.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
