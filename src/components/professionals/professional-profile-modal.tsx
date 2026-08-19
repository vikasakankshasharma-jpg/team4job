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
import { toDate, cn } from "@/lib/utils";
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
        <div className="group relative aspect-square rounded-[2rem] overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-all active:scale-95 shadow-2xl ring-1 ring-white/5">
            {/* Placeholder for real image */}
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 text-secondary-foreground backdrop-blur-md">
                <ImageIcon className="h-10 w-10 opacity-20 group-hover:scale-110 transition-transform duration-500" />
            </div>
            {!isError && (
                <Image
                    src={item.imageUrl || item.afterImageUrl || ''}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    onError={() => setIsError(true)}
                />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-foreground/60 p-2 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {item.title}
            </div>
        </div>
    );
}

interface ProfessionalProfileModalProps {
    Professional: User;
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onUpdateAction?: (professionalId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void;
    workHistory?: Job[]; // Jobs this Professional has done for the current user
}

export function ProfessionalProfileModal({
    Professional,
    isOpen,
    onClose,
    currentUser,
    onUpdateAction,
    workHistory = []
}: ProfessionalProfileModalProps) {
    const [activeTab, setActiveTab] = useState("about");

    if (!Professional) return null;

    const isFavorite = currentUser?.favoriteProfessionalIds?.includes(Professional.id);
    const isBlocked = currentUser?.blockedProfessionalIds?.includes(Professional.id);

    const tierColor = {
        Bronze: "text-amber-700 bg-amber-100 border-amber-200",
        Silver: "text-slate-600 bg-slate-100 border-slate-200",
        Gold: "text-yellow-600 bg-yellow-100 border-yellow-200",
        Platinum: "text-cyan-600 bg-cyan-100 border-cyan-200",
    }[Professional.professionalProfile?.tier || "Bronze"];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 rounded-[3rem] overflow-hidden border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
                {/* Header Section */}
                <div className="p-10 pb-8 border-b border-white/5 bg-background/5 relative">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-shrink-0">
                            <Avatar className="h-28 w-28 border-[4px] border-background shadow-2xl ring-2 ring-primary/20 transition-transform duration-500 hover:scale-105">
                                <AnimatedAvatar svg={Professional.realAvatarUrl} />
                                <AvatarFallback className="text-3xl font-black italic">{Professional.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                                        {Professional.name}
                                        {Professional.professionalProfile?.verified && (
                                            <ShieldCheck className="h-6 w-6 text-success animate-pulse" />
                                        )}
                                    </DialogTitle>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 flex items-center gap-2 italic">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {Professional.address?.cityPincode || "GLOBAL NODE"}
                                    </p>
                                </div>

                                <Badge className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.3em] border italic shadow-xl rounded-full ${tierColor}`}>
                                    {Professional.professionalProfile?.tier || "Bronze"} TIER
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 fill-primary text-primary" />
                                    <span>{Professional.professionalProfile?.rating.toFixed(1)}</span>
                                    <span className="opacity-40">({Professional.professionalProfile?.reviews} REVIEWS)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{Professional.professionalProfile?.reviews || 0} MISSIONS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>JOINED {format(toDate(Professional.memberSince), "MMM yyyy").toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-8">
                        <Button className="flex-1 h-14 rounded-[1.25rem] bg-primary font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all" onClick={() => { }}>
                            <MessageSquare className="mr-3 h-4 w-4" />
                            INITIATE COMMS
                        </Button>

                        {onUpdateAction && (
                            <>
                                <Button
                                    variant={isFavorite ? "secondary" : "outline"}
                                    onClick={() => onUpdateAction(Professional.id, isFavorite ? 'unfavorite' : 'favorite')}
                                    className={cn(
                                        "h-14 w-14 rounded-[1.25rem] p-0 shadow-xl transition-all hover:scale-110",
                                        isFavorite ? "bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200" : "border-white/10"
                                    )}
                                >
                                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                                    <span className="sr-only">Favorite</span>
                                </Button>

                                <Button
                                    variant={isBlocked ? "destructive" : "outline"}
                                    onClick={() => onUpdateAction(Professional.id, isBlocked ? 'unblock' : 'block')}
                                    className="h-14 w-14 rounded-[1.25rem] p-0 shadow-xl border-white/10 transition-all hover:scale-110"
                                >
                                    <UserX className="h-5 w-5" />
                                    <span className="sr-only">Block</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-background/40 backdrop-blur-xl">
                    <div className="px-8 border-b border-white/5">
                        <TabsList className="w-full justify-start h-16 bg-transparent p-0 gap-8">
                            <TabsTrigger
                                value="about"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="portfolio"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                            >
                                Portfolio
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                            >
                                History {workHistory.length > 0 && `(${workHistory.length})`}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <TabsContent value="about" className="m-0 space-y-6">
                                <div>
                                    <h3 className="text-xs font-black italic tracking-tighter uppercase mb-3 flex items-center gap-2 text-primary">
                                        <Award className="h-4 w-4" /> Professional Statement
                                    </h3>
                                    <p className="text-sm text-foreground/80 leading-relaxed italic font-medium">
                                        &quot;{Professional.professionalProfile?.bio || "No professional statement provided yet."}&quot;
                                    </p>
                                </div>

                                <Separator className="bg-background/5" />

                                <div>
                                    <h3 className="text-xs font-black italic tracking-tighter uppercase mb-4 flex items-center gap-2 text-primary">
                                        <ShieldCheck className="h-4 w-4" /> Hard Core Competencies
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Professional.professionalProfile?.specialties?.map((spec) => (
                                            <Badge key={spec} variant="secondary" className="px-4 py-1.5 rounded-[1rem] font-black italic tracking-tighter uppercase text-[10px]">
                                                {spec}
                                            </Badge>
                                        ))}
                                        {Professional.professionalProfile?.skills?.map((skill) => (
                                            <Badge key={skill} variant="outline" className="px-4 py-1.5 rounded-[1rem] border-white/10 font-black italic tracking-tighter uppercase text-[10px]">
                                                {skill}
                                            </Badge>
                                        ))}
                                        {(!Professional.professionalProfile?.skills?.length && !Professional.professionalProfile?.specialties?.length) && (
                                            <span className="text-sm text-muted-foreground italic">No skills listed.</span>
                                        )}
                                    </div>
                                </div>

                                <Separator className="bg-background/5" />

                                <div>
                                    <h3 className="text-xs font-black italic tracking-tighter uppercase mb-4 flex items-center gap-2 text-primary">
                                        <Clock className="h-4 w-4" /> Mission Status
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {Professional.professionalProfile?.availability?.status === 'busy' ? (
                                            <Badge variant="destructive">Busy / Fully Booked</Badge>
                                        ) : Professional.professionalProfile?.availability?.status === 'on-vacation' ? (
                                            <Badge variant="secondary">On Vacation</Badge>
                                        ) : (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Available Now</Badge>
                                        )}

                                        {Professional.professionalProfile?.availability?.nextAvailable && (
                                            <span className="text-sm text-muted-foreground">
                                                Next available: {format(toDate(Professional.professionalProfile.availability.nextAvailable), "MMM d, yyyy")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="portfolio" className="m-0">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {Professional.professionalProfile?.portfolio?.map((item) => (
                                        <PortfolioThumbnail key={item.id} item={item} />
                                    )) || (
                                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground bg-muted/20 rounded-[2rem] border border-dashed border-white/5 hover:bg-muted/30 transition-all">
                                                <ImageIcon className="h-12 w-12 mb-4 opacity-10" />
                                                <p className="text-xs font-black uppercase tracking-widest">No visual proof of work</p>
                                                <p className="text-[10px] opacity-60 mt-1 uppercase tracking-wider">Historical records for this unit are currently pending.</p>
                                            </div>
                                        )}
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="m-0 space-y-4">
                                {workHistory.length > 0 ? (
                                    workHistory.map(job => (
                                        <div key={job.id} className="flex items-start justify-between p-6 border border-white/5 rounded-[1.5rem] bg-card/40 backdrop-blur-sm hover:bg-accent/5 transition-all hover:translate-x-1">
                                            <div>
                                                <h4 className="font-black italic tracking-tighter uppercase text-sm mb-1">{job.title}</h4>
                                                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground/60">
                                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                    <span>COMPLETED // {format(toDate(job.completionTimestamp || job.postedAt), "MMMM yyyy").toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline" className="rounded-full border-white/10 text-[10px] font-black uppercase tracking-widest">{job.jobCategory}</Badge>
                                                <div className="mt-2 text-sm font-black text-primary italic tracking-tight">₹{job.bids.find(b => b.professionalId === Professional.id)?.amount.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-[2rem] border border-dashed border-white/5">
                                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                        <p className="text-xs font-black uppercase tracking-widest">No shared history</p>
                                        <p className="text-[10px] opacity-60 mt-1 uppercase tracking-wider">Mission records with this professional are currently null.</p>
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


