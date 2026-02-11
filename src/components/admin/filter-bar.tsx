"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface FilterOption {
    label: string;
    value: string;
}

export interface Filter {
    id: string;
    label: string;
    type: "search" | "select" | "date";
    options?: FilterOption[];
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
}

interface FilterBarProps {
    filters: Filter[];
    onReset?: () => void;
    showResetButton?: boolean;
    resetLabel?: string;
}

export function FilterBar({ filters, onReset, showResetButton = true, resetLabel }: FilterBarProps) {
    const t = useTranslations('admin.components.filter');
    const hasActiveFilters = filters.some((f) => f.value && f.value !== "all");

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
                {filters.map((filter) => (
                    <div key={filter.id} className="flex-1 min-w-[200px]">
                        <Label htmlFor={filter.id} className="mb-2 block">
                            {filter.label}
                        </Label>
                        {filter.type === "search" && (
                            <Input
                                id={filter.id}
                                placeholder={filter.placeholder || t('searchPlaceholder')}
                                value={filter.value}
                                onChange={(e) => filter.onChange(e.target.value)}
                            />
                        )}
                        {filter.type === "select" && (
                            <Select value={filter.value} onValueChange={filter.onChange}>
                                <SelectTrigger id={filter.id}>
                                    <SelectValue placeholder={filter.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filter.options?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                ))}

                {showResetButton && hasActiveFilters && onReset && (
                    <Button variant="outline" onClick={onReset} className="shrink-0">
                        <X className="h-4 w-4 mr-2" />
                        {resetLabel || t('reset')}
                    </Button>
                )}
            </div>
        </div>
    );
}

