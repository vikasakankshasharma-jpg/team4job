import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
    // Step 1
    firstName: string;
    lastName: string;
    shopName: string;
    city: string;
    pincode: string;

    // Step 2
    category: string;
    experience: string;
    skills: string[];

    // Step 3 (Files are not persisted in local storage easily, handled separately or transiently)
    aadharFront?: File;
    aadharBack?: File;
    panCard?: File;
    policeVerification?: File;
    profilePhoto?: File;

    // Actions
    updateData: (data: Partial<OnboardingState>) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            firstName: "",
            lastName: "",
            shopName: "",
            city: "",
            pincode: "",
            category: "",
            experience: "0-2",
            skills: [],

            updateData: (data) => set((state) => ({ ...state, ...data })),
            reset: () => set({
                firstName: "",
                lastName: "",
                shopName: "",
                city: "",
                pincode: "",
                category: "",
                experience: "0-2",
                skills: [],
                aadharFront: undefined,
                aadharBack: undefined,
                panCard: undefined,
                policeVerification: undefined,
                profilePhoto: undefined,
            }),
        }),
        {
            name: 'onboarding-storage',
            partialize: (state) => ({
                // Exclude files from persistence as they are not serializable
                firstName: state.firstName,
                lastName: state.lastName,
                shopName: state.shopName,
                city: state.city,
                pincode: state.pincode,
                category: state.category,
                experience: state.experience,
                skills: state.skills
            }),
        }
    )
);
