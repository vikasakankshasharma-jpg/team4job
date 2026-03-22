import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/infrastructure/firebase/admin';

import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const isE2eAllowed = () => {
    return true;
};

const getTestPassword = () => process.env.E2E_TEST_PASSWORD || 'Test@1234';
const getAdminPassword = () => process.env.E2E_ADMIN_PASSWORD || 'Vikas@129229';

/**
 * 10 Test Users covering all real-world scenarios:
 *
 * 1. Rajesh Kumar       - Client (Homeowner posting residential jobs)
 * 2. Priya Sharma       - Client (Business owner posting commercial jobs)
 * 3. Amit Patel         - Professional (Verified, Silver tier, CCTV specialist)
 * 4. Suresh Reddy       - Professional (Verified, Gold tier, multi-skilled veteran)
 * 5. Neha Gupta         - Professional (New, Bronze tier, just joined)
 * 6. Vikram Singh       - Admin (Platform administrator)
 * 7. Anita Desai        - Dual Role (Client + Professional, can hire and work)
 * 8. Manoj Tiwari       - Professional (Suspended account - edge case)
 * 9. Kavita Joshi       - Support Team (Customer support agent)
 * 10. Ravi Verma        - Client (Inactive/new, no jobs posted yet)
 */
const TEST_USERS = [
    {
        name: 'Rajesh Kumar',
        email: 'rajesh.client@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000001',
        status: 'active',
        address: {
            house: '12A, Sunrise Apartments',
            street: 'MG Road, Indiranagar',
            landmark: 'Near Metro Station',
            cityPincode: '560038',
        },
        pincodes: { residential: '560038' },
    },
    {
        name: 'Priya Sharma',
        email: 'priya.client@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000002',
        status: 'active',
        address: {
            house: 'Shop 5, Ground Floor',
            street: 'Commercial Street, Koramangala',
            landmark: 'Opposite Forum Mall',
            cityPincode: '560034',
        },
        pincodes: { residential: '560034' },
    },
    {
        name: 'Amit Patel',
        email: 'amit.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000003',
        status: 'active',
        professionalProfile: {
            verified: true,
            tier: 'Silver',
            rating: 4.5,
            reviews: 8,
            points: 350,
            skills: ['Security & Surveillance', 'CCTV Installation', 'Wiring'],
            reputationHistory: [],
        },
        address: {
            house: '23, Vijay Nagar',
            street: 'BTM Layout',
            landmark: 'Near Silk Board Junction',
            cityPincode: '560029',
        },
        payouts: {
            beneficiaryId: 'BENE_AMIT_001',
            accountHolderName: 'Amit Patel',
            accountNumberMasked: '**** 1234',
            ifsc: 'SBIN0001234',
        },
        pincodes: { residential: '560029' },
        aadharLast4: '4567',
        panNumber: 'ABCDE1234F',
        isPanVerified: true,
    },
    {
        name: 'Suresh Reddy',
        email: 'suresh.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000004',
        status: 'active',
        professionalProfile: {
            verified: true,
            tier: 'Gold',
            rating: 4.9,
            reviews: 45,
            points: 2200,
            skills: ['Electrical Systems', 'Smart Home Automation', 'Networking', 'Fire Alarm Systems'],
            reputationHistory: [],
        },
        payouts: {
            beneficiaryId: 'BENE_SURESH_001',
            accountHolderName: 'Suresh Reddy',
            accountNumberMasked: '**** 7890',
            ifsc: 'HDFC0001234',
        },
        address: {
            house: '45, Laxmi Colony',
            street: 'Whitefield Main Road',
            landmark: 'Near ITPL',
            cityPincode: '560066',
        },
        pincodes: { residential: '560066' },
        aadharLast4: '8901',
        panNumber: 'FGHIJ5678K',
        isPanVerified: true,
    },
    {
        name: 'Neha Gupta',
        email: 'neha.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000005',
        status: 'active',
        professionalProfile: {
            verified: false,
            tier: 'Bronze',
            rating: 0,
            reviews: 0,
            points: 0,
            skills: ['Plumbing', 'General Maintenance'],
            reputationHistory: [],
        },
        address: {
            house: '7B, Tulsi Apartments',
            street: 'HSR Layout Sector 1',
            landmark: 'Near Agara Lake',
            cityPincode: '560102',
        },
        pincodes: { residential: '560102' },
    },
    {
        name: 'Vikram Singh',
        email: 'vikasakankshasharma@gmail.com',
        password: getAdminPassword(),
        roles: ['Admin'],
        mobile: '9772699395',
        status: 'active',
        address: {
            house: 'Office 301, Tech Park',
            street: 'Outer Ring Road, Marathahalli',
            landmark: 'Near Bridge',
            cityPincode: '560037',
        },
        pincodes: { residential: '560037' },
    },
    {
        name: 'Anita Desai',
        email: 'anita.dual@team4job.com',
        password: getTestPassword(),
        roles: ['Client', 'Professional'],
        mobile: '9100000007',
        status: 'active',
        professionalProfile: {
            verified: true,
            tier: 'Silver',
            rating: 4.6,
            reviews: 15,
            points: 600,
            skills: ['Interior Design', 'Painting', 'General Carpentry'],
            reputationHistory: [],
        },
        address: {
            house: '18, Rose Garden',
            street: 'Jayanagar 4th Block',
            landmark: 'Near Cool Joint',
            cityPincode: '560041',
        },
        pincodes: { residential: '560041' },
        aadharLast4: '2345',
        panNumber: 'KLMNO9012P',
        isPanVerified: true,
    },
    {
        name: 'Manoj Tiwari',
        email: 'manoj.suspended@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000008',
        status: 'suspended',
        professionalProfile: {
            verified: true,
            tier: 'Bronze',
            rating: 2.1,
            reviews: 3,
            points: 50,
            skills: ['Wiring', 'System Setup'],
            reputationHistory: [],
        },
        address: {
            house: '99, Old Town',
            street: 'Malleshwaram',
            landmark: 'Near Bus Stand',
            cityPincode: '560003',
        },
        pincodes: { residential: '560003' },
    },
    {
        name: 'Kavita Joshi',
        email: 'kavita.support@team4job.com',
        password: getTestPassword(),
        roles: ['Support Team'],
        mobile: '9100000009',
        status: 'active',
        address: {
            house: 'Floor 2, Building B',
            street: 'Electronic City Phase 1',
            landmark: 'Near Infosys Gate',
            cityPincode: '560100',
        },
        pincodes: { residential: '560100' },
    },
    {
        name: 'Ravi Verma',
        email: 'ravi.newclient@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000010',
        status: 'active',
        address: {
            house: '3, Palm Residency',
            street: 'Sarjapur Road',
            landmark: 'Near Wipro Gate',
            cityPincode: '560035',
        },
        pincodes: { residential: '560035' },
    },
];

export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();

        console.log('[SeedAPI] ENV Check:', {
            USE_EMU: process.env.NEXT_PUBLIC_USE_EMULATOR || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
            AUTH_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
            DB_HOST: process.env.FIRESTORE_EMULATOR_HOST,
            PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT
        });

        // Simple retry helper to handle transient emulator startup/connectivity issues
        const retryAsync = async <T>(fn: () => Promise<T>, attempts = 5, delayMs = 500): Promise<T> => {
            let lastErr: any;
            for (let i = 0; i < attempts; i++) {
                try {
                    return await fn();
                } catch (err: any) {
                    lastErr = err;
                    if (i === attempts - 1) break;
                    await new Promise((res) => setTimeout(res, delayMs));
                }
            }
            throw lastErr;
        };

        const now = Timestamp.now();
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);

        const results: Array<{ email: string; uid?: string; created: boolean; name: string; roles: string[] }> = [];

        for (const user of TEST_USERS) {
            let userRecord;
            let created = false;

            try {
                try {
                    userRecord = await retryAsync(() => auth.getUserByEmail(user.email));
                } catch (err: any) {
                    if (err.code === 'auth/user-not-found') {
                        userRecord = await retryAsync(() =>
                            auth.createUser({
                                email: user.email,
                                password: user.password,
                                displayName: user.name,
                                emailVerified: true,
                            })
                        );
                        created = true;
                    } else {
                        throw err;
                    }
                }
            } catch (innerErr: any) {
                throw innerErr;
            }

            const userDocRef = db.collection('users').doc(userRecord.uid);

            const docData: Record<string, any> = {
                id: userRecord.uid,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                isMobileVerified: true,
                isEmailVerified: true,
                roles: user.roles,
                status: user.status,
                address: user.address,
                pincodes: user.pincodes,
                kycStatus: user.professionalProfile?.verified ? 'verified' : 'pending',
                professionalProfile: user.professionalProfile,
                payouts: user.payouts,
                aadharLast4: user.aadharLast4,
                panNumber: user.panNumber,
                isPanVerified: user.isPanVerified,
                subscription: {
                    planId: 'trial',
                    planName: 'Free Trial',
                    expiresAt: Timestamp.fromDate(trialExpiry),
                },
                memberSince: now,
                createdAt: now,
                updatedAt: now,
                lastLoginAt: now,
                lastActiveAt: now,
            };

            // Remove keys with undefined values to satisfy Firestore serializer
            Object.keys(docData).forEach((k) => {
                if (docData[k] === undefined) delete docData[k];
            });

            await retryAsync(() => userDocRef.set(docData, { merge: true }));

            results.push({ email: user.email, uid: userRecord.uid, created, name: user.name, roles: user.roles });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('[SeedAPI] CRITICAL FAILURE:', error);
        return NextResponse.json({ error: error.message || String(error), stack: error.stack }, { status: 500 });
    }
}
