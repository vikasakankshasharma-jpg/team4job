"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineDetector() {
    const [isOffline, setIsOffline] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            toast({
                title: "Back Online",
                description: "Your connection has been restored.",
                variant: "default",
            });
        };

        const handleOffline = () => {
            setIsOffline(true);
            toast({
                title: "You are Offline",
                description: "You are currently disconnected. Some features may be limited.",
                variant: "destructive",
            });
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Initial check
        if (!navigator.onLine) {
            setIsOffline(true);
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [toast]);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
                >
                    <WifiOff className="h-4 w-4" />
                    <span>Working Offline - Changes will sync when reconnected</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
