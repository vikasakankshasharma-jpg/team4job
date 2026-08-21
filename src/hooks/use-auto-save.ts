import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from './use-user';
import { saveDraftAction } from '@/app/actions/draft.actions';
import { JobDraft } from '@/lib/api/drafts';
import { useToast } from './use-toast';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
    enabled?: boolean;
    interval?: number; // milliseconds
    onSave?: (draftId: string) => void;
    onError?: (error: Error) => void;
}

export function useAutoSave(
    getDraftData: () => Partial<JobDraft>,
    options: UseAutoSaveOptions = {}
) {
    const {
        enabled = true,
        interval = 30000, // 30 seconds default
        onSave,
        onError,
    } = options;

    const { user } = useUser();
    const { toast } = useToast();

    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [draftId, setDraftId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSavedData, setLastSavedData] = useState<string>('');

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    // Manual save function
    const saveNow = useCallback(async () => {
        if (!user || isSavingRef.current) {
            return;
        }

        // Allow disabling auto-save via window property for testing
        if (typeof window !== 'undefined' && (window as unknown as { __DISABLE_AUTO_SAVE__?: boolean }).__DISABLE_AUTO_SAVE__) {
            return;
        }

        const draftData = getDraftData();

        // Check if there's actually any data to save
        if (!draftData.title && !draftData.description) {
            return;
        }

        isSavingRef.current = true;
        setSaveStatus('saving');

        try {
            const result = await saveDraftAction(user.id, draftData, draftId || undefined);

            if (!result.success || !result.draftId) {
                throw new Error(result.error || 'Failed to save draft');
            }

            const id = result.draftId;

            setDraftId(id);
            setLastSavedData(JSON.stringify(draftData));
            setHasChanges(false);
            setSaveStatus('saved');

            onSave?.(id);

            // Reset to idle after 2 seconds
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            setSaveStatus('error');

            toast({
                title: 'Failed to save draft',
                description: 'Your changes could not be saved. Please try again.',
                variant: 'destructive',
            });

            onError?.(error as Error);
        } finally {
            isSavingRef.current = false;
        }
    }, [user, getDraftData, draftId, onSave, onError, toast]);

    // Detect changes
    useEffect(() => {
        if (!enabled) return;

        const currentData = JSON.stringify(getDraftData());
        if (currentData !== lastSavedData && currentData !== '{}') {
            const timer = setTimeout(() => setHasChanges(true), 0);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setHasChanges(false), 0);
            return () => clearTimeout(timer);
        }
    }, [getDraftData, lastSavedData, enabled]);

    // Auto-save interval
    useEffect(() => {
        if (!enabled || !hasChanges) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(() => {
            saveNow();
        }, interval);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [enabled, hasChanges, interval, saveNow]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        saveStatus,
        hasChanges,
        draftId,
        saveNow,
        setDraftId, // Expose to allow setting draft ID when loading
    };
}
