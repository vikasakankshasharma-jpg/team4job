"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    professional?: string;
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
    const t = useTranslations('dashboard');
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
                            <Button variant="outline" size="sm" className="gap-2 rounded-[1rem] border-white/10 bg-surface-container-low/40 backdrop-blur-xl font-black italic tracking-tighter uppercase px-5 h-10 shadow-xl shadow-primary/5 hover:bg-surface-container-high transition-all">
                                <Filter className="h-4 w-4 text-primary" />
                                {t('advancedFilters')}
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 rounded-full bg-primary text-primary-foreground font-black text-[10px]">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                                {isOpen ? (
                                    <ChevronUp className="h-4 w-4 opacity-50" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                )}
                            </Button>
                        </CollapsibleTrigger>

                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all rounded-full"
                            >
                                Purge All Filters
                            </Button>
                        )}
                    </div>

                    <CollapsibleContent className="mt-6">
                        <div className="rounded-[3.5rem] border-none bg-surface-container-low/60 backdrop-blur-3xl p-10 space-y-10 shadow-[0_40px_100px_rgba(0,0,0,0.2)] ring-1 ring-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                            <FilterFormFields
                                localFilters={localFilters}
                                handleFilterUpdate={handleFilterUpdate}
                                categories={categories}
                            />
                            <div className="flex justify-end pt-8 border-t border-white/5 relative z-10">
                                <Button onClick={applyFilters} size="sm" className="rounded-[1.5rem] font-black italic tracking-tighter uppercase px-10 h-12 shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
                                    Execute Filter Scan
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
                    <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-[2.5rem] bg-surface-container-high/95 backdrop-blur-3xl border-t border-white/10">
                        <SheetHeader className="px-6 py-6 border-b border-white/5">
                            <SheetTitle className="text-xl font-black italic tracking-tighter uppercase">Filter Parameters</SheetTitle>
                            <SheetDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                                Calibrate mission discovery parameters.
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
                    {appliedFilters.professional && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                            Professional: {appliedFilters.professional}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0.5 hover:bg-transparent"
                                onClick={() => removeFilter("professional")}
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
