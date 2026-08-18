"use client";

import React, { useState, useEffect } from "react";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "react-toastify";

export function NotificationSettings() {
    const { db } = useFirebase();
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState({
        isEmailEnabled: true,
        isPushEnabled: true,
        isSmsEnabled: true,
        isWhatsappEnabled: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            if (!db) return;
            try {
                const docRef = doc(db, 'platform_settings', 'notifications');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as typeof settings);
                }
            } catch (err) {
                console.error("Failed to fetch notification settings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [db]);

    const handleToggle = async (key: keyof typeof settings) => {
        if (!db) return;
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        
        try {
            const docRef = doc(db, 'platform_settings', 'notifications');
            await setDoc(docRef, newSettings, { merge: true });
            toast.success("Settings updated globally.");
        } catch (err) {
            console.error("Failed to update settings:", err);
            toast.error("Failed to update settings.");
            // Revert
            setSettings(settings);
        }
    };

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-2xl group mt-6">
            <CardHeader className="p-6 sm:p-10 border-b border-white/5 bg-gradient-to-br from-background to-secondary/10">
                <CardTitle className="text-xl font-black italic tracking-widest uppercase text-primary flex items-center gap-3">
                    <Bell className="h-6 w-6 text-primary" /> Global Master Switches
                </CardTitle>
                <CardDescription className="text-foreground/60">
                    Instantly turn off communication channels across the entire platform. This overrides all user preferences and background tasks.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 space-y-6">
                
                <div className="flex items-center justify-between border border-white/5 p-4 rounded-xl bg-background/40">
                    <div className="flex items-center gap-4">
                        <Smartphone className="h-6 w-6 text-foreground/70" />
                        <div>
                            <p className="font-bold">SMS Notifications</p>
                            <p className="text-sm text-foreground/60">Controls MSG91/Twilio Tier-4 Fallback</p>
                        </div>
                    </div>
                    <Switch 
                        checked={settings.isSmsEnabled} 
                        onCheckedChange={() => handleToggle('isSmsEnabled')} 
                    />
                </div>

                <div className="flex items-center justify-between border border-white/5 p-4 rounded-xl bg-background/40">
                    <div className="flex items-center gap-4">
                        <Mail className="h-6 w-6 text-foreground/70" />
                        <div>
                            <p className="font-bold">Email Notifications</p>
                            <p className="text-sm text-foreground/60">Controls SendGrid Tier-5 Fallback</p>
                        </div>
                    </div>
                    <Switch 
                        checked={settings.isEmailEnabled} 
                        onCheckedChange={() => handleToggle('isEmailEnabled')} 
                    />
                </div>

                <div className="flex items-center justify-between border border-white/5 p-4 rounded-xl bg-background/40">
                    <div className="flex items-center gap-4">
                        <MessageSquare className="h-6 w-6 text-foreground/70" />
                        <div>
                            <p className="font-bold">WhatsApp Notifications</p>
                            <p className="text-sm text-foreground/60">Controls Meta WhatsApp API</p>
                        </div>
                    </div>
                    <Switch 
                        checked={settings.isWhatsappEnabled} 
                        onCheckedChange={() => handleToggle('isWhatsappEnabled')} 
                    />
                </div>

                <div className="flex items-center justify-between border border-white/5 p-4 rounded-xl bg-background/40">
                    <div className="flex items-center gap-4">
                        <Bell className="h-6 w-6 text-foreground/70" />
                        <div>
                            <p className="font-bold">Push Notifications</p>
                            <p className="text-sm text-foreground/60">Controls Firebase Cloud Messaging (FCM)</p>
                        </div>
                    </div>
                    <Switch 
                        checked={settings.isPushEnabled} 
                        onCheckedChange={() => handleToggle('isPushEnabled')} 
                    />
                </div>

            </CardContent>
        </Card>
    );
}
