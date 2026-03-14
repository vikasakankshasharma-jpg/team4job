/**
 * Search History Utilities
 * Manages search history in localStorage for quick recall
 */

const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
    query: string;
    timestamp: number;
}

/**
 * Get search history for a specific page
 */
export function getSearchHistory(storageKey: string): string[] {
    try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return [];

        const history: SearchHistoryItem[] = JSON.parse(stored);
        return history.map(item => item.query);
    } catch (error) {
        return [];
    }
}

/**
 * Add a search query to history
 */
export function addToSearchHistory(storageKey: string, query: string): void {
    if (!query.trim()) return;

    try {
        const existing = getSearchHistory(storageKey);

        // Remove if already exists (we'll add it to the top)
        const filtered = existing.filter(q => q !== query);

        // Add to beginning
        const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);

        // Convert to items with timestamps
        const items: SearchHistoryItem[] = updated.map(q => ({
            query: q,
            timestamp: Date.now(),
        }));

        localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
        // Localstorage failed
    }
}

/**
 * Clear all search history
 */
export function clearSearchHistory(storageKey: string): void {
    try {
        localStorage.removeItem(storageKey);
    } catch (error) {
        // Localstorage failed
    }
}

/**
 * Remove a specific item from history
 */
export function removeFromSearchHistory(storageKey: string, query: string): void {
    try {
        const existing = getSearchHistory(storageKey);
        const updated = existing.filter(q => q !== query);

        const items: SearchHistoryItem[] = updated.map(q => ({
            query: q,
            timestamp: Date.now(),
        }));

        localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
        // Localstorage failed
    }
}
