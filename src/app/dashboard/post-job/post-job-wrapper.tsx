"use client";

import React from 'react';
import { useJsApiLoader } from "@react-google-maps/api";
import PostJobClient from './post-job-client';

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

export default function PostJobWrapper() {
    const { isLoaded: isMapLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    return <PostJobClient isMapLoaded={isMapLoaded} />;
}
