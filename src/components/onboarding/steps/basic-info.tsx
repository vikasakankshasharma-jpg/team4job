"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BasicInfoProps {
    data: any;
    updateData: (data: any) => void;
}

export function BasicInfo({ data, updateData }: BasicInfoProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        placeholder="John"
                        value={data.firstName || ""}
                        onChange={(e) => updateData({ ...data, firstName: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                        id="lastName"
                        placeholder="Doe"
                        value={data.lastName || ""}
                        onChange={(e) => updateData({ ...data, lastName: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name (Optional)</Label>
                <Input
                    id="shopName"
                    placeholder="John's Electronics"
                    value={data.shopName || ""}
                    onChange={(e) => updateData({ ...data, shopName: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        placeholder="Mumbai"
                        value={data.city || ""}
                        onChange={(e) => updateData({ ...data, city: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                        id="pincode"
                        placeholder="400001"
                        maxLength={6}
                        value={data.pincode || ""}
                        onChange={(e) => updateData({ ...data, pincode: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
