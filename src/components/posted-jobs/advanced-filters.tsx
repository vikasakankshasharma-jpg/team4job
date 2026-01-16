"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import { FilterFormFields } from "@/components/posted-jobs/filter-form-fields";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface JobFilters {
    budgetMin?: number;
    budgetMax?: number;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    installer?: string;
    search?: string;
}

interface AdvancedFiltersProps {
    onFilterChange: (filters: JobFilters) => void;
    appliedFilters: JobFilters;
    categories: string[];
}

export function AdvancedFilters({
    onFilterChange,
    appliedFilters,
    categories,
}: AdvancedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState<JobFilters>(appliedFilters);

    const handleFilterUpdate = (key: keyof JobFilters, value: any) => {
        const updated = { ...localFilters, [key]: value };
        setLocalFilters(updated);
    };

    const applyFilters = () => {
        onFilterChange(localFilters);
    };

    const clearAllFilters = () => {
        const emptyFilters: JobFilters = {};
        setLocalFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    const removeFilter = (key: keyof JobFilters) => {
        const updated = { ...localFilters };
        delete updated[key];
        setLocalFilters(updated);
        onFilterChange(updated);
    };

    const activeFilterCount = Object.keys(appliedFilters).filter(
        (key) => appliedFilters[key as keyof JobFilters] !== undefined && appliedFilters[key as keyof JobFilters] !== ""
    ).length;

    return (
        <div className="space-y-4">
            {/* Desktop View: Collapsible */}
            <div className="hidden md:block">
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <div className="flex items-center justify-between">
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Advanced Filters
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                                {isOpen ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </Button>
                        </CollapsibleTrigger>

                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>

                    <CollapsibleContent className="mt-4">
                        <div className="rounded-lg border bg-card p-4 space-y-4">
                            <FilterFormFields
                                localFilters={localFilters}
                                handleFilterUpdate={handleFilterUpdate}
                                categories={categories}
                            />

                            <div className="flex justify-end">
                                <Button onClick={applyFilters} size="sm">
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            {/* Mobile View: Sheet */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2 h-10">
                            <Filter className="h-4 w-4" />
                            Filters & Sort
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
                        <SheetHeader className="px-4 py-3 border-b">
                            <SheetTitle>Filter Jobs</SheetTitle>
                            <SheetDescription>
                                Narrow down your job list
                            </SheetDescription>
                        </SheetHeader>

                        <ScrollArea className="flex-1 p-4">
                            <FilterFormFields
                                localFilters={localFilters}
                                handleFilterUpdate={handleFilterUpdate}
                                categories={categories}
                            />
                        </ScrollArea>

                        <div className="p-4 border-t bg-background flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    clearAllFilters();
                                    // Optional: close sheet? relying on user to close or Apply
                                }}
                            >
                                Clear
                            </Button>
                            <SheetClose asChild>
                                <Button className="flex-1" onClick={applyFilters}>
                                    Show Results
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    {appliedFilters.search && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            Search: {appliedFilters.search}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("search")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {appliedFilters.budgetMin && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            Min: ₹{appliedFilters.budgetMin.toLocaleString()}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("budgetMin")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {appliedFilters.budgetMax && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            Max: ₹{appliedFilters.budgetMax.toLocaleString()}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("budgetMax")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {appliedFilters.category && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            Category: {appliedFilters.category}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("category")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {appliedFilters.dateFrom && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            From: {appliedFilters.dateFrom}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("dateFrom")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {appliedFilters.dateTo && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            To: {appliedFilters.dateTo}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("dateTo")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {appliedFilters.installer && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            Installer: {appliedFilters.installer}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("installer")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
