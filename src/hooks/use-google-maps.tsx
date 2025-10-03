
"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import React, { createContext, useContext, useMemo } from "react";

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

type GoogleMapsContextType = {
  isLoaded: boolean;
};

const GoogleMapsContext = createContext<GoogleMapsContextType | null>(null);

export const GoogleMapsProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const value = useMemo(() => ({
    isLoaded,
  }), [isLoaded]);

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error("useGoogleMaps must be used within a GoogleMapsProvider");
  }
  return context;
};
