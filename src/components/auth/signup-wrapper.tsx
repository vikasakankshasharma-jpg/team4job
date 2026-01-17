"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { SignUpForm } from "./signup-form";
import { Loader2 } from "lucide-react";

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

export function SignUpWrapper({ referredBy }: { referredBy?: string }) {
    const { isLoaded: isMapLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    return <SignUpForm isMapLoaded={isMapLoaded} referredBy={referredBy} />;
}
