
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useFormContext, useController, Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJsApiLoader } from '@react-google-maps/api';

interface PostOffice {
    Name: string;
    District: string;
    State: string;
}

interface PincodeResponse {
    Message: string;
    Status: string;
    PostOffice: PostOffice[] | null;
}

interface LocationInputProps {
    name: string;
    label: string;
    placeholder?: string;
    description?: string;
    control: Control<any>;
    onLocationGeocoded?: (coords: { lat: number; lng: number }) => void;
}

export function LocationInput({ name, label, placeholder, description, control, onLocationGeocoded }: LocationInputProps) {
    const { field, fieldState } = useController({ name, control });
    const { setValue } = useFormContext();

    const [pincode, setPincode] = useState('');
    const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPostOffice, setSelectedPostOffice] = useState('');

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script-geocoding',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    useEffect(() => {
        if (field.value && typeof field.value === 'string') {
            const [currentPincode, currentPO] = field.value.split(', ');
            if (currentPincode && currentPincode.length === 6) {
                setPincode(currentPincode);
                fetchPostOffices(currentPincode);
                if (currentPO) {
                    setSelectedPostOffice(currentPO);
                }
            } else {
                setPincode(field.value);
            }
        }
    }, [field.value]);

    const fetchPostOffices = useCallback(async (currentPincode: string) => {
        if (currentPincode.length !== 6) {
            setPostOffices([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        setPostOffices([]);
        setSelectedPostOffice('');

        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${currentPincode}`);
            const data: PincodeResponse[] = await response.json();

            if (data && data[0].Status === 'Success' && data[0].PostOffice) {
                setPostOffices(data[0].PostOffice);
            } else {
                setError(data[0].Message || 'Invalid PIN code or no post offices found.');
            }
        } catch (e) {
            setError('Failed to fetch location data. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setPincode(value);
        setValue(name, value, { shouldValidate: true });
        if (value.length === 6) {
            fetchPostOffices(value);
        } else {
            setPostOffices([]);
            setSelectedPostOffice('');
        }
    };

    const handlePostOfficeChange = (postOfficeName: string) => {
        setSelectedPostOffice(postOfficeName);
        const fullLocation = `${pincode}, ${postOfficeName}`;
        setValue(name, fullLocation, { shouldValidate: true, shouldDirty: true });

        if (isLoaded && onLocationGeocoded) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: fullLocation }, (results, status) => {
                if (status === 'OK' && results && results[0].geometry) {
                    const location = results[0].geometry.location;
                    onLocationGeocoded({ lat: location.lat(), lng: location.lng() });
                }
            });
        }
    };

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Input
                        placeholder={placeholder}
                        value={pincode}
                        onChange={handlePincodeChange}
                        maxLength={6}
                        className="pr-10"
                    />
                    {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <Select
                    onValueChange={handlePostOfficeChange}
                    value={selectedPostOffice}
                    disabled={postOffices.length === 0 || isLoading}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Post Office" />
                    </SelectTrigger>
                    <SelectContent>
                        {postOffices.map((po) => (
                            <SelectItem key={po.Name} value={po.Name}>
                                {po.Name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {description && !fieldState.error && <FormDescription>{description}</FormDescription>}
            <FormMessage>{fieldState.error?.message || error}</FormMessage>
        </FormItem>
    );
}
