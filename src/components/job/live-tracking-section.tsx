import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Job, User } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { MapPin, Navigation, EyeOff } from "lucide-react";
import LazyMap from "@/components/ui/lazy-map";
import { useToast } from "@/hooks/use-toast";
import { updateJobLocationAction } from "@/app/actions/job.actions";

export function LiveTrackingSection({ job, user, isClient }: { job: Job, user: User, isClient: boolean }) {
    const jobAny = job as any;
    const { toast } = useToast();
    const [isSharing, setIsSharing] = React.useState(false);
    const watchIdRef = React.useRef<number | null>(null);

    const handleToggleShare = (checked: boolean) => {
        setIsSharing(checked);
        if (checked) {
            if ("geolocation" in navigator) {
                toast({ title: "Location Sharing Active", description: "Your client can now see your ETA and route." });
                watchIdRef.current = navigator.geolocation.watchPosition(async (position) => {
                    await updateJobLocationAction(job.id, position.coords.latitude, position.coords.longitude);
                }, (error) => {
                    console.error("Error watching location:", error);
                    toast({ title: "Location Error", description: "Could not access GPS.", variant: "destructive" });
                    setIsSharing(false);
                }, { enableHighAccuracy: true });
            } else {
                toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
                setIsSharing(false);
            }
        } else {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            toast({ title: "Location Sharing Paused", description: "Your location is no longer visible to the client." });
        }
    };

    React.useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    const hasLocation = jobAny.installerLocation && jobAny.installerLocation.lat && jobAny.installerLocation.lng;

    return (
        <Card className="mt-8 border border-border/50 shadow-2xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/30 pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                        <MapPin className="text-primary h-6 w-6" />
                        Day of Job Tracking
                    </CardTitle>
                    {!isClient && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Share Location</span>
                            <Switch checked={isSharing} onCheckedChange={handleToggleShare} />
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isClient ? (
                    hasLocation ? (
                                                <div className="h-[400px] w-full relative">
                            <LazyMap 
                                center={{ lat: jobAny.installerLocation!.lat, lng: jobAny.installerLocation!.lng }} 
                                zoom={15}
                                onLoad={() => {}}
                                onUnmount={() => {}}
                                onClick={() => {}}
                                containerStyle={{ width: '100%', height: '100%' }}
                            >
                            </LazyMap>
                            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-xl flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="font-bold text-xs uppercase tracking-widest">Installer En Route</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] w-full flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                            <EyeOff className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                            <h3 className="font-bold text-lg mb-2">Location Hidden</h3>
                            <p className="text-sm text-muted-foreground max-w-md">The installer has paused location sharing. Live tracking is completely optional to respect privacy.</p>
                        </div>
                    )
                ) : (
                    <div className="p-8 text-center bg-muted/5">
                        {isSharing ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                                    <Navigation className="h-8 w-8 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-green-500">Broadcasting Live</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Your client can see your ETA. You can pause this at any time using the toggle above.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <EyeOff className="h-12 w-12 text-muted-foreground opacity-50" />
                                <div>
                                    <h3 className="font-bold text-lg">Tracking is Paused</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Toggle sharing on when you are en route to the job site. This feature is completely optional.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


