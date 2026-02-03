import { useEffect, useRef, useState, useCallback } from 'react';
import { useFirebase, useUser } from './use-user';
import { saveDraft, JobDraft } from '@/lib/api/drafts';
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
    const { db } = useFirebase();
    const { toast } = useToast();

    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [draftId, setDraftId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSavedData, setLastSavedData] = useState<string>('');

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    // Manual save function
    const saveNow = useCallback(async () => {
        if (!user || !db || isSavingRef.current) {
            return;
        }

        // Allow disabling auto-save via window property for testing
        if (typeof window !== 'undefined' && (window as any).__DISABLE_AUTO_SAVE__) {
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
            const id = await saveDraft(db, user.id, draftData, draftId || undefined);

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
            console.error('Error saving draft:', error);
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
    }, [user, db, getDraftData, draftId, onSave, onError, toast]);

    // Detect changes
    useEffect(() => {
        if (!enabled) return;

        const currentData = JSON.stringify(getDraftData());
        if (currentData !== lastSavedData && currentData !== '{}') {
            setHasChanges(true);
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
