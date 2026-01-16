"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, Clock, Trash2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getSearchHistory,
    addToSearchHistory,
    clearSearchHistory,
    removeFromSearchHistory,
} from "@/lib/services/search-history";
import { useDebounce } from "@/hooks/use-debounce";
import Fuse from "fuse.js";

export interface SmartSearchProps {
    placeholder?: string;
    value?: string;
    onSearch: (query: string) => void;
    suggestions?: string[];
    enableHistory?: boolean;
    storageKey?: string;
    className?: string;
}

export function SmartSearch({
    placeholder = "Search...",
    value: controlledValue,
    onSearch,
    suggestions = [],
    enableHistory = true,
    storageKey = "smartSearch_default",
    className,
}: SmartSearchProps) {
    const [value, setValue] = useState(controlledValue || "");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [history, setHistory] = useState<string[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Debounce search to avoid excessive filtering
    const debouncedValue = useDebounce(value, 300);

    // Load search history on mount
    useEffect(() => {
        if (enableHistory) {
            setHistory(getSearchHistory(storageKey));
        }
    }, [enableHistory, storageKey]);

    // Trigger search when debounced value changes
    useEffect(() => {
        onSearch(debouncedValue);
    }, [debouncedValue, onSearch]);

    // Fuzzy match suggestions
    const filteredSuggestions = useMemo(() => {
        if (!value || !suggestions.length) return [];

        const fuse = new Fuse(suggestions, {
            threshold: 0.3,
            ignoreLocation: true,
        });

        return fuse.search(value).map(result => result.item).slice(0, 5);
    }, [value, suggestions]);

    const handleChange = (newValue: string) => {
        setValue(newValue);
        setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0);
        setSelectedIndex(-1);
    };

    const handleSelectSuggestion = (suggestion: string) => {
        setValue(suggestion);
        setShowSuggestions(false);
        onSearch(suggestion);

        if (enableHistory) {
            addToSearchHistory(storageKey, suggestion);
            setHistory(getSearchHistory(storageKey));
        }
    };

    const handleSelectHistory = (query: string) => {
        setValue(query);
        setHistoryOpen(false);
        onSearch(query);
    };

    const handleClearHistory = () => {
        clearSearchHistory(storageKey);
        setHistory([]);
    };

    const handleRemoveHistoryItem = (query: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeFromSearchHistory(storageKey, query);
        setHistory(getSearchHistory(storageKey));
    };

    const handleClear = () => {
        setValue("");
        onSearch("");
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || filteredSuggestions.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                );
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleSelectSuggestion(filteredSuggestions[selectedIndex]);
                } else {
                    setShowSuggestions(false);
                    if (enableHistory && value) {
                        addToSearchHistory(storageKey, value);
                        setHistory(getSearchHistory(storageKey));
                    }
                }
                break;
            case "Escape":
                setShowSuggestions(false);
                break;
        }
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                !inputRef.current?.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={cn("relative flex items-center gap-2", className)}>
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0)}
                    className="pl-8 pr-8"
                />
                {value && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}

                {/* Auto-complete suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute top-full mt-1 w-full border rounded-md bg-background shadow-lg z-50"
                    >
                        {filteredSuggestions.map((suggestion, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "px-3 py-2 cursor-pointer flex items-center gap-2 text-sm",
                                    idx === selectedIndex ? "bg-accent" : "hover:bg-accent"
                                )}
                                onClick={() => handleSelectSuggestion(suggestion)}
                            >
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{suggestion}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search history */}
            {enableHistory && history.length > 0 && (
                <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="hidden sm:inline">Recent</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="end">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between px-2 py-1">
                                <p className="text-sm font-semibold">Recent Searches</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-1 text-xs"
                                    onClick={handleClearHistory}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Clear
                                </Button>
                            </div>
                            {history.map((query, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between px-2 py-2 rounded-sm hover:bg-accent cursor-pointer group"
                                    onClick={() => handleSelectHistory(query)}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm truncate">{query}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-1 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => handleRemoveHistoryItem(query, e)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
