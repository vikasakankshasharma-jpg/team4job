
"use client";

import { useFormContext, useController } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./form";
import { Input } from "./input";
import { LocationInput } from "./location-input";
import { Separator } from "./separator";
import { Map } from "lucide-react";

interface AddressFormProps {
    pincodeName: string;
    houseName: string;
    streetName: string;
    landmarkName: string;
    onLocationGeocoded?: (coords: { lat: number; lng: number }) => void;
}

export function AddressForm({ pincodeName, houseName, streetName, landmarkName, onLocationGeocoded }: AddressFormProps) {
    const { control } = useFormContext();
    
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
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Map className="h-4 w-4"/>
                <span>The map will update based on the full address provided.</span>
            </div>
        </div>
    )
}
