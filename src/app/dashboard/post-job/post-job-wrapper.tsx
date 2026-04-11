"use client";

import React from 'react';
import { useJsApiLoader } from "@react-google-maps/api";
import PostJobClient from './post-job-client';

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

export default function PostJobWrapper() {
    const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
    
    const { isLoaded: googleMapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: isE2E ? "" : (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""),
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    // CI Stabilization: In E2E mode, we skip Google Maps to avoid ExpiredKeyMapError 
    // and IntersectionObserver crashes. The components will show manual input fallbacks.
    const isMapLoaded = isE2E ? false : googleMapsLoaded;

    return <PostJobClient isMapLoaded={isMapLoaded} />;
}
