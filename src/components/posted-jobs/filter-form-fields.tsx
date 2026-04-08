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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search */}
            <div className="space-y-3">
                <Label htmlFor="filter-search" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Mission Query</Label>
                <Input
                    id="filter-search"
                    placeholder="SCANNING FOR TITLES..."
                    value={localFilters.search || ""}
                    onChange={(e) => handleFilterUpdate("search", e.target.value)}
                    className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs placeholder:opacity-20 shadow-inner"
                />
            </div>

            {/* Budget Range */}
            <div className="space-y-3">
                <Label htmlFor="filter-budget-min" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Min Payload (₹)</Label>
                <Input
                    id="filter-budget-min"
                    type="number"
                    placeholder="0"
                    value={localFilters.budgetMin || ""}
                    onChange={(e) =>
                        handleFilterUpdate("budgetMin", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs placeholder:opacity-20 shadow-inner"
                />
            </div>

            <div className="space-y-3">
                <Label htmlFor="filter-budget-max" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Max Payload (₹)</Label>
                <Input
                    id="filter-budget-max"
                    type="number"
                    placeholder="1,000,000"
                    value={localFilters.budgetMax || ""}
                    onChange={(e) =>
                        handleFilterUpdate("budgetMax", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs placeholder:opacity-20 shadow-inner"
                />
            </div>

            {/* Category */}
            <div className="space-y-3">
                <Label htmlFor="filter-category" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Sector Class</Label>
                <Select
                    value={localFilters.category || "all"}
                    onValueChange={(value) =>
                        handleFilterUpdate("category", value === "all" ? undefined : value)
                    }
                >
                    <SelectTrigger id="filter-category" className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs shadow-inner">
                        <SelectValue placeholder="OMNI-SECTOR SCAN" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[1.25rem] bg-surface-container-high/90 backdrop-blur-xl border-white/5 p-1">
                        <SelectItem value="all" className="rounded-[0.75rem] font-black italic tracking-tighter uppercase text-xs">OMNI-SECTOR SCAN</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="rounded-[0.75rem] font-black italic tracking-tighter uppercase text-xs">
                                {cat.toUpperCase()}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
                <Label htmlFor="filter-date-from" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Temporal Origin</Label>
                <Input
                    id="filter-date-from"
                    type="date"
                    value={localFilters.dateFrom || ""}
                    onChange={(e) => handleFilterUpdate("dateFrom", e.target.value)}
                    className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs shadow-inner"
                />
            </div>

            <div className="space-y-3">
                <Label htmlFor="filter-date-to" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Temporal Limit</Label>
                <Input
                    id="filter-date-to"
                    type="date"
                    value={localFilters.dateTo || ""}
                    onChange={(e) => handleFilterUpdate("dateTo", e.target.value)}
                    className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs shadow-inner"
                />
            </div>

            {/* Professional */}
            <div className="space-y-3">
                <Label htmlFor="filter-professional" className="text-[10px] font-black italic tracking-widest uppercase text-muted-foreground/60 ml-1">Unit ID Designation</Label>
                <Input
                    id="filter-professional"
                    placeholder="DESIGNATION NAME..."
                    value={localFilters.professional || ""}
                    onChange={(e) => handleFilterUpdate("professional", e.target.value)}
                    className="h-12 rounded-[1rem] bg-background/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all font-black italic tracking-tighter uppercase text-xs placeholder:opacity-20 shadow-inner"
                />
            </div>
        </div>
    );
}
