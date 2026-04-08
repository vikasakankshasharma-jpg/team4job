import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HelpState {
    isSidebarOpen: boolean;
    activeTourId: string | null;
    currentStep: number;
    completedTourIds: string[];
    
    // Actions
    toggleSidebar: (open?: boolean) => void;
    startTour: (tourId: string) => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
    completeTour: (tourId: string) => void;
}

export const useHelpStore = create<HelpState>()(
    persist(
        (set) => ({
            isSidebarOpen: false,
            activeTourId: null,
            currentStep: 0,
            completedTourIds: [],

            toggleSidebar: (open) => set((state) => ({ 
                isSidebarOpen: typeof open === 'boolean' ? open : !state.isSidebarOpen 
            })),
            
            startTour: (tourId) => set({
                activeTourId: tourId,
                currentStep: 0,
                isSidebarOpen: false // Close sidebar when starting a tour for focus
            }),

            nextStep: () => set((state) => ({ 
                currentStep: state.currentStep + 1 
            })),

            prevStep: () => set((state) => ({ 
                currentStep: Math.max(0, state.currentStep - 1) 
            })),

            endTour: () => set({
                activeTourId: null,
                currentStep: 0
            }),

            completeTour: (tourId) => set((state) => ({
                completedTourIds: state.completedTourIds.includes(tourId) 
                    ? state.completedTourIds 
                    : [...state.completedTourIds, tourId],
                activeTourId: null,
                currentStep: 0
            })),
        }),
        {
            name: 'intel-command-storage',
            partialize: (state) => ({
                completedTourIds: state.completedTourIds
            }),
        }
    )
);
