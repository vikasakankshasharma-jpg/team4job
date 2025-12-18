
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useFormContext, useController, Control } from 'react-hook-form';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
const debounce = require('lodash.debounce');

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

interface MapInputProps {
  name: string;
  label: string;
  control: Control<any>;
  center?: { lat: number; lng: number } | null;
  isMapLoaded: boolean;
}

export function MapInput({ name, label, control, center: propCenter, isMapLoaded }: MapInputProps) {
  const { field: addressField, fieldState: addressFieldState } = useController({ name, control });
  const { setValue } = useFormContext();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.LatLngLiteral | null>(propCenter || null);
  const [center, setCenter] = useState(propCenter || defaultCenter);

  const geocodeAddress = useCallback(
    (address: string) => {
      if (isMapLoaded && address && window.google) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
          if (status === 'OK' && results && results[0].geometry) {
            const location = results[0].geometry.location;
            const newPos = { lat: location.lat(), lng: location.lng() };
            if (map) {
              map.panTo(newPos);
            }
            setCenter(newPos);
            setMarker(newPos);
          }
        });
      }
    },
    [isMapLoaded, map]
  );

  const debouncedGeocode = useCallback(debounce(geocodeAddress, 1000), [geocodeAddress]);

  useEffect(() => {
    if (propCenter) {
      setCenter(propCenter);
      setMarker(propCenter);
      if (map) {
        map.panTo(propCenter);
      }
    }
  }, [propCenter, map]);


  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && isMapLoaded && window.google) {
      const newMarkerPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarker(newMarkerPos);

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newMarkerPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setValue(name, results[0].formatted_address, { shouldValidate: true, shouldDirty: true });
        } else {
          console.error('Geocoder failed due to: ' + status);
        }
      });
    }
  }, [setValue, name, isMapLoaded]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    if (marker) {
      mapInstance.panTo(marker);
    }
  }, [marker]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(name, event.target.value, { shouldValidate: true, shouldDirty: true });
    debouncedGeocode(event.target.value);
  }

  if (!isMapLoaded) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Input
          placeholder="Enter full address manually (Map unavailable)"
          {...addressField}
        />
        <FormDescription className="text-yellow-600 dark:text-yellow-500">
          Map features are currently unavailable. Please enter your address manually.
        </FormDescription>
        <FormMessage>{addressFieldState.error?.message}</FormMessage>
      </FormItem>
    );
  }

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Input
        placeholder="Type address or click on map"
        {...addressField}
        onChange={handleAddressChange}
      />
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={onMapLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>
      <FormDescription>
        Click on the map to pin the exact job location or type the full address. This is required.
      </FormDescription>
      <FormMessage>{addressFieldState.error?.message}</FormMessage>
    </FormItem>
  );
}
