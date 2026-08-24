"use client";

import React from 'react';
import { useJsApiLoader } from "@react-google-maps/api";
import DealerPostJobClient from './dealer-post-job-client';

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

function LiveMapWrapper() {
    const { isLoaded: googleMapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES,
    });
    return <DealerPostJobClient isMapLoaded={googleMapsLoaded} />;
}

export default function DealerPostJobWrapper() {
    const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
    
    // CI Stabilization: In E2E mode, we skip Google Maps to avoid ExpiredKeyMapError 
    // and IntersectionObserver crashes. The components will show manual input fallbacks.
    if (isE2E) {
        return <DealerPostJobClient isMapLoaded={false} />;
    }

    return <LiveMapWrapper />;
}
