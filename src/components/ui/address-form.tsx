
"use client";

import { useFormContext, useController } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "./form";
import { Input } from "./input";
import { LocationInput } from "./location-input";
import { Separator } from "./separator";
import { MapInput } from "./map-input";

interface AddressFormProps {
    pincodeName: string;
    houseName: string;
    streetName: string;
    landmarkName: string;
    fullAddressName: string;
    onLocationGeocoded?: (coords: { lat: number; lng: number }) => void;
    mapCenter?: { lat: number; lng: number } | null;
}

export function AddressForm({ 
    pincodeName, 
    houseName, 
    streetName, 
    landmarkName, 
    fullAddressName,
    onLocationGeocoded,
    mapCenter
}: AddressFormProps) {
    const { control, watch } = useFormContext();
    
    return (
        <div className="space-y-6">
            <LocationInput
                name={pincodeName}
                label="Location (Pincode)"
                placeholder="e.g. 110001"
                control={control}
                onLocationGeocoded={onLocationGeocoded}
            />

            <Separator />
            
            <div className="space-y-2">
                <FormLabel>Detailed Address</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={control}
                        name={houseName}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">House / Flat No. & Building</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Flat 4B, Sunshine Apartments" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={streetName}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Street, Colony / Area</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 12th Main Road, Indiranagar" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={control}
                    name={landmarkName}
                    render={({ field }) => (
                        <FormItem>
                             <FormLabel className="text-xs">Nearby Landmark (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Near City Hospital" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <MapInput 
                name={fullAddressName}
                label="Set Precise Location on Map (Optional)"
                control={control}
                center={mapCenter}
             />
             <FormDescription>
                The map is currently optional for testing. You can proceed without interacting with it.
             </FormDescription>
        </div>
    )
}

    