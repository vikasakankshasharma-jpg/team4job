"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { SignUpForm } from "./signup-form";
import { Loader2 } from "lucide-react";

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

export function SignUpWrapper({ referredBy }: { referredBy?: string }) {
    const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
    const { isLoaded: googleMapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    // CI Stabilization: If in E2E mode, we assume maps are "loaded" to bypass the 
    // loading spinner, even if the API key is expired or the script fails to load.
    const isMapLoaded = isE2E ? true : googleMapsLoaded;

    return <SignUpForm isMapLoaded={isMapLoaded} referredBy={referredBy} />;
}
