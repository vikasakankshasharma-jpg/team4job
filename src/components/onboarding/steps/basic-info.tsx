"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, MapPin, Building2, Store } from "lucide-react";

interface BasicInfoProps {
    data: any;
    updateData: (data: any) => void;
}

export function BasicInfo({ data, updateData }: BasicInfoProps) {
    return (
        <div className="space-y-10">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Basic Information
                </h2>
                <p className="text-muted-foreground">Tell us a bit about yourself and your professional identity.</p>
            </div>

            <div className="grid gap-8">
                {/* Personal Info Group */}
                <div className="p-8 rounded-[2.5rem] border-2 border-border/50 bg-card/50 space-y-6 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <div className="p-2.5 rounded-[0.75rem] bg-primary/10 ring-1 ring-primary/20 shadow-inner">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        Personal Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                            <Input
                                id="firstName"
                                placeholder="John"
                                value={data.firstName || ""}
                                onChange={(e) => updateData({ ...data, firstName: e.target.value })}
                                className="h-16 bg-background/50 backdrop-blur-3xl border-white/10 focus:border-primary/50 rounded-[1.25rem] text-lg px-8 transition-all shadow-inner font-semibold italic"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                            <Input
                                id="lastName"
                                placeholder="Doe"
                                value={data.lastName || ""}
                                onChange={(e) => updateData({ ...data, lastName: e.target.value })}
                                className="h-16 bg-background/50 backdrop-blur-3xl border-white/10 focus:border-primary/50 rounded-[1.25rem] text-lg px-8 transition-all shadow-inner font-semibold italic"
                            />
                        </div>
                    </div>
                </div>

                {/* Business Info Group */}
                <div className="p-8 rounded-[2.5rem] border-2 border-border/50 bg-card/50 space-y-6 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <div className="p-2.5 rounded-[0.75rem] bg-primary/10 ring-1 ring-primary/20 shadow-inner">
                            <Store className="h-5 w-5 text-primary" />
                        </div>
                        Business Profile
                    </h3>
                    <div className="space-y-2">
                        <Label htmlFor="shopName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Shop Name (Optional)</Label>
                        <Input
                            id="shopName"
                            placeholder="John's Electronics"
                            value={data.shopName || ""}
                            onChange={(e) => updateData({ ...data, shopName: e.target.value })}
                            className="h-14 bg-background border-muted-foreground/20 focus:border-primary/50 rounded-2xl text-lg px-6 transition-all shadow-inner"
                        />
                    </div>
                </div>

                {/* Location Group */}
                <div className="p-8 rounded-[2.5rem] border-2 border-border/50 bg-card/50 space-y-6 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <div className="p-2.5 rounded-[0.75rem] bg-primary/10 ring-1 ring-primary/20 shadow-inner">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        Service Area
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="city" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                            <Input
                                id="city"
                                placeholder="Mumbai"
                                value={data.city || ""}
                                onChange={(e) => updateData({ ...data, city: e.target.value })}
                                className="h-16 bg-background/50 backdrop-blur-3xl border-white/10 focus:border-primary/50 rounded-[1.25rem] text-lg px-8 transition-all shadow-inner font-semibold italic"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pincode" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Pincode</Label>
                            <Input
                                id="pincode"
                                placeholder="400001"
                                maxLength={6}
                                value={data.pincode || ""}
                                onChange={(e) => updateData({ ...data, pincode: e.target.value })}
                                className="h-16 bg-background/50 backdrop-blur-3xl border-white/10 focus:border-primary/50 rounded-[1.25rem] text-lg px-8 transition-all shadow-inner font-mono tracking-[0.3em] font-black italic"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
