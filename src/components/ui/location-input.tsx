
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
    Country: string;
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
    
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');


    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    const handlePostOfficeChange = useCallback((postOfficeName: string, pc: string, poData?: PostOffice) => {
        const currentPincode = pc || pincode;
        const currentPOData = poData || postOffices.find(p => p.Name === postOfficeName);

        if (!currentPOData) return;

        setSelectedPostOffice(postOfficeName);
        setCity(currentPOData.District);
        setState(currentPOData.State);
        setCountry(currentPOData.Country);
        const fullLocation = `${currentPincode}, ${postOfficeName}`;
        setValue(name, fullLocation, { shouldValidate: true, shouldDirty: true });

        if (isLoaded && onLocationGeocoded && window.google) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: fullLocation }, (results, status) => {
                if (status === 'OK' && results && results[0].geometry) {
                    const location = results[0].geometry.location;
                    onLocationGeocoded({ lat: location.lat(), lng: location.lng() });
                }
            });
        }
    }, [pincode, postOffices, setValue, name, isLoaded, onLocationGeocoded]);
    
    const fetchPostOffices = useCallback(async (currentPincode: string, defaultPO?: string) => {
        if (currentPincode.length !== 6) {
            setPostOffices([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        setPostOffices([]);
        setSelectedPostOffice('');
        setCity('');
        setState('');
        setCountry('');

        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${currentPincode}`);
            const data: PincodeResponse[] = await response.json();

            if (data && data[0].Status === 'Success' && data[0].PostOffice) {
                const fetchedPOs = data[0].PostOffice;
                setPostOffices(fetchedPOs);
                setCity(fetchedPOs[0].District);
                setState(fetchedPOs[0].State);
                setCountry(fetchedPOs[0].Country);
                
                if (fetchedPOs.length === 1) {
                    // If only one post office, auto-select it
                    handlePostOfficeChange(fetchedPOs[0].Name, currentPincode, fetchedPOs[0]);
                } else if (defaultPO && fetchedPOs.some(po => po.Name === defaultPO)) {
                    handlePostOfficeChange(defaultPO, currentPincode, fetchedPOs.find(p => p.Name === defaultPO));
                }
            } else {
                setError(data[0].Message || 'Invalid PIN code or no post offices found.');
            }
        } catch (e) {
            setError('Failed to fetch location data. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, [handlePostOfficeChange]);
    
    useEffect(() => {
        if (field.value && typeof field.value === 'string') {
            const [currentPincode, currentPO] = field.value.split(', ');
            if (currentPincode && currentPincode.length === 6) {
                setPincode(currentPincode);
                if (!postOffices.length) {
                    fetchPostOffices(currentPincode, currentPO);
                }
            } else {
                setPincode(field.value);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [field.value]);

    const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setPincode(value);
        if (value.length === 6) {
            fetchPostOffices(value);
        } else {
            setPostOffices([]);
            setSelectedPostOffice('');
            setCity('');
            setState('');
            setCountry('');
        }
        setValue(name, value, { shouldValidate: true });
    };

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
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
                    onValueChange={(value) => handlePostOfficeChange(value, pincode)}
                    value={selectedPostOffice}
                    disabled={postOffices.length <= 1 || isLoading}
                >
                    <SelectTrigger>
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
                 <Input value={city} placeholder="City / District" disabled className="bg-muted/50" />
                 <Input value={state} placeholder="State" disabled className="bg-muted/50" />
                 <Input value={country} placeholder="Country" disabled className="bg-muted/50" />
            </div>
            {description && !fieldState.error && <FormDescription>{description}</FormDescription>}
            <FormMessage>{fieldState.error?.message || error}</FormMessage>
        </FormItem>
    );
}
