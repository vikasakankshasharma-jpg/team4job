
import {
    Firestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore';
import wizardData from '@/data/job-wizard-questions.json';

export interface JobTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    defaultAnswers: Record<string, any>;
    userId?: string; // Optional: presence indicates a personal template
    specificQuestionIds?: string[]; // If only a subset of questions is needed
    type?: 'global' | 'personal'; // Added to distinguish source
}

/**
 * AI Template Service
 * Manages the mapping between templates and dynamic question flows.
 */
export class AITemplateService {

    // Global Predefined Templates
    private globalTemplates: JobTemplate[] = [
        {
            id: 'template-cctv-home',
            name: 'Home 4-Device CCTV Setup',
            description: 'Standard 4-point indoor/outdoor camera setup for residential property',
            category: 'Security & Surveillance',
            defaultAnswers: {
                sub_type: 'cctv',
                camera_coverage_points: '3-4',
                camera_mounting_type: 'Both',
                site_complexity: 'SingleFloor',
                cabling_labor: 'FreshWiring',
                recording_setup: '1Week',
                special_features: 'AudioOnly',
                display_setup: 'MobileOnly',
                urgency: 'Flexible'
            },
            type: 'global'
        },
        {
            id: 'template-cctv-shop',
            name: 'Shop 8-Device CCTV Setup',
            description: 'Comprehensive 8-point camera setup for commercial shop with monitor',
            category: 'Security & Surveillance',
            defaultAnswers: {
                sub_type: 'cctv',
                camera_coverage_points: '8+',
                camera_mounting_type: 'Both',
                site_complexity: 'Commercial',
                cabling_labor: 'FreshWiring',
                recording_setup: '1Month+',
                special_features: 'TwoWay',
                display_setup: 'Both',
                urgency: '1-2 Days'
            },
            type: 'global'
        },
        {
            id: 'template-wifi-home',
            name: 'Home WiFi Coverage Setup',
            description: 'Standard multi-room WiFi setup for residential property',
            category: 'Networking & IT',
            defaultAnswers: {
                sub_type: 'wifi',
                wifi_area: 'SingleFloor',
                wifi_walls: 'StandardBrick',
                wifi_device_count: '10-25',
                urgency: 'Flexible'
            },
            type: 'global'
        },
        {
            id: 'template-elec-repair',
            name: 'Minor Electrical Repairs',
            description: 'Fixing a few faulty switches or sockets',
            category: 'Electrical & Power',
            defaultAnswers: {
                sub_type: 'repairs',
                repair_scope: '3-5',
                repair_type: 'SwitchSocket',
                repair_urgency_context: 'JustOnePoint',
                urgency: 'Standard'
            },
            type: 'global'
        }
    ];

    /**
     * Get all categories from wizard data
     */
    getCategories() {
        return wizardData.categories.map(c => ({
            id: c.id,
            icon: c.icon,
            description: c.description
        }));
    }

    /**
     * Get all templates (Global + Personal) for a user/category
     */
    async getAllTemplates(db: Firestore, userId: string, category: string): Promise<JobTemplate[]> {
        // 1. Get Global Templates
        const global = this.globalTemplates.filter(t => t.category === category);

        // 2. Get Personal Templates from Firestore
        const personalRef = collection(db, 'userTemplates');
        const q = query(personalRef, where('userId', '==', userId), where('category', '==', category));
        const snapshot = await getDocs(q);

        const personal = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as JobTemplate));

        return [...global, ...personal];
    }

    /**
     * Save a new customized template for a user
     */
    async savePersonalTemplate(
        db: Firestore,
        userId: string,
        data: Omit<JobTemplate, 'id' | 'userId'>
    ): Promise<string> {
        const personalRef = collection(db, 'userTemplates');
        const docRef = await addDoc(personalRef, {
            ...data,
            userId,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    }

    /**
     * Get wizard configuration by category (default questions)
     */
    getQuestionsByCategory(categoryId: string) {
        const cat = wizardData.categories.find(c => c.id === categoryId);
        if (!cat) throw new Error('Category not found');
        return cat.questions;
    }

    /**
     * Get full wizard configuration by category (returns Category object)
     */
    getCategoryConfig(categoryId: string) {
        return wizardData.categories.find(c => c.id === categoryId) || null;
    }

    /**
     * Get wizard configuration (merged with personal templates if needed)
     */
    async getWizardConfig(db: Firestore, categoryId: string, templateId?: string | null) {
        let template: JobTemplate | undefined;

        if (templateId) {
            template = this.globalTemplates.find(t => t.id === templateId);

            if (!template) {
                // Check Firestore for personal template
                const docRef = doc(db, 'userTemplates', templateId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    template = { id: snap.id, ...snap.data() } as JobTemplate;
                }
            }
        }

        const category = wizardData.categories.find(c => c.id === (template?.category || categoryId));
        if (!category) throw new Error('Category not found');

        return {
            template: template || { category: categoryId },
            questions: category.questions,
            preFilledAnswers: template?.defaultAnswers || {}
        };
    }
}

export const aiTemplateService = new AITemplateService();
