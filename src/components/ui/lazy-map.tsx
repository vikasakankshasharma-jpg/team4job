"use client";

import { GoogleMap, Marker } from '@react-google-maps/api';
import React from 'react';

/**
 * Lazy loaded map component to avoid pulling in heavy Google Maps libraries 
 * on initial page load.
 */
interface LazyMapProps {
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLoad: (map: google.maps.Map) => void;
    onUnmount: (map: google.maps.Map) => void;
    onClick: (e: google.maps.MapMouseEvent) => void;
    marker?: google.maps.LatLngLiteral | null;
    containerStyle: React.CSSProperties;
}

export default function LazyMap({
    center,
    zoom,
    onLoad,
    onUnmount,
    onClick,
    marker,
    containerStyle
}: LazyMapProps) {
    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={onClick}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
        >
            {marker && <Marker position={marker} />}
        </GoogleMap>
    );
}
