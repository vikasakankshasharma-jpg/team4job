
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./form";
import { Input } from "./input";
import { LocationInput } from "./location-input";
import { Separator } from "./separator";
import { MapInput } from "./map-input";
import { useTranslations } from "next-intl";

interface AddressFormProps {
    pincodeName: string;
    houseName: string;
    streetName: string;
    landmarkName: string;
    fullAddressName: string;
    onLocationGeocoded?: (coords: { lat: number; lng: number }) => void;
    mapCenter?: { lat: number; lng: number } | null;
    isMapLoaded: boolean;
}

export function AddressForm({
    pincodeName,
    houseName,
    streetName,
    landmarkName,
    fullAddressName,
    onLocationGeocoded,
    mapCenter,
    isMapLoaded
}: AddressFormProps) {
    const { control } = useFormContext();
    const t = useTranslations("address");

    return (
        <div className="space-y-6">
            <LocationInput
                name={pincodeName}
                label={t('locationPincode')}
                placeholder={t('pincodePlaceholder')}
                control={control}
                onLocationGeocoded={onLocationGeocoded}
                isMapLoaded={isMapLoaded}
            />

            <Separator />

            <div className="space-y-2">
                <FormLabel>{t('detailedAddress')}</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={control}
                        name={houseName}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">{t('houseFlatNo')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('housePlaceholder')} {...field} data-testid="house-input" className="h-11" aria-label={t('houseFlatNo')} />
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
                                <FormLabel className="text-xs">{t('streetColony')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('streetPlaceholder')} {...field} data-testid="street-input" className="h-11" aria-label={t('streetColony')} />
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
                            <FormLabel className="text-xs">{t('landmarkOptional')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('landmarkPlaceholder')} {...field} data-testid="landmark-input" className="h-11" aria-label={t('landmarkOptional')} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <MapInput
                name={fullAddressName}
                label={t('setPreciseLocation')}
                control={control}
                center={mapCenter}
                isMapLoaded={isMapLoaded}
            />
        </div>
    )
}
