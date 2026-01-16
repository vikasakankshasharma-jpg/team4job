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
import { JobFilters } from "@/components/posted-jobs/advanced-filters";

interface FilterFormFieldsProps {
    localFilters: JobFilters;
    handleFilterUpdate: (key: keyof JobFilters, value: any) => void;
    categories: string[];
}

export function FilterFormFields({
    localFilters,
    handleFilterUpdate,
    categories,
}: FilterFormFieldsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
                <Label htmlFor="filter-search">Search</Label>
                <Input
                    id="filter-search"
                    placeholder="Job title..."
                    value={localFilters.search || ""}
                    onChange={(e) => handleFilterUpdate("search", e.target.value)}
                    className="h-12 md:h-10 text-base md:text-sm" // Touch opt
                />
            </div>

            {/* Budget Range */}
            <div className="space-y-2">
                <Label htmlFor="filter-budget-min">Min Budget</Label>
                <Input
                    id="filter-budget-min"
                    type="number"
                    placeholder="₹0"
                    value={localFilters.budgetMin || ""}
                    onChange={(e) =>
                        handleFilterUpdate("budgetMin", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="h-12 md:h-10 text-base md:text-sm"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="filter-budget-max">Max Budget</Label>
                <Input
                    id="filter-budget-max"
                    type="number"
                    placeholder="₹100,000"
                    value={localFilters.budgetMax || ""}
                    onChange={(e) =>
                        handleFilterUpdate("budgetMax", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="h-12 md:h-10 text-base md:text-sm"
                />
            </div>

            {/* Category */}
            <div className="space-y-2">
                <Label htmlFor="filter-category">Category</Label>
                <Select
                    value={localFilters.category || "all"}
                    onValueChange={(value) =>
                        handleFilterUpdate("category", value === "all" ? undefined : value)
                    }
                >
                    <SelectTrigger id="filter-category" className="h-12 md:h-10 text-base md:text-sm">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
                <Label htmlFor="filter-date-from">Posted From</Label>
                <Input
                    id="filter-date-from"
                    type="date"
                    value={localFilters.dateFrom || ""}
                    onChange={(e) => handleFilterUpdate("dateFrom", e.target.value)}
                    className="h-12 md:h-10 text-base md:text-sm"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="filter-date-to">Posted To</Label>
                <Input
                    id="filter-date-to"
                    type="date"
                    value={localFilters.dateTo || ""}
                    onChange={(e) => handleFilterUpdate("dateTo", e.target.value)}
                    className="h-12 md:h-10 text-base md:text-sm"
                />
            </div>

            {/* Installer */}
            <div className="space-y-2">
                <Label htmlFor="filter-installer">Installer Name</Label>
                <Input
                    id="filter-installer"
                    placeholder="Search by installer..."
                    value={localFilters.installer || ""}
                    onChange={(e) => handleFilterUpdate("installer", e.target.value)}
                    className="h-12 md:h-10 text-base md:text-sm"
                />
            </div>
        </div>
    );
}
