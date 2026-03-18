import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/infrastructure/firebase/admin';

import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const isE2eAllowed = () => {
    return true;
};

const getTestPassword = () => process.env.E2E_TEST_PASSWORD || 'Test@1234';
const getAdminPassword = () => process.env.E2E_ADMIN_PASSWORD || 'Vks2bhdj@9229';

const TEST_USERS = [
    {
        name: 'Test Client',
        email: 'giver_vip_v3@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9000000001',
    },
    {
        name: 'Test Professional',
        email: 'Professional_pro_v3@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9000000002',
        professionalProfile: {
            verified: true,
            tier: 'Silver',
            rating: 4.8,
            reviews: 12,
            points: 500,
            skills: ['Security & Surveillance', 'Wiring', 'System Setup'],
        },
        payouts: {
            beneficiaryId: 'TEST_BENE_Professional',
            accountHolderName: 'Test Professional',
            accountNumberMasked: '**** 1234',
            ifsc: 'TEST0001234',
        },
    },
    {
        name: 'Test Admin',
        email: 'vikasakankshasharma_v3@gmail.com',
        password: getAdminPassword(),
        roles: ['Admin'],
        mobile: '9000000003',
    },
    {
        name: 'Dual Role User',
        email: 'dualrole@example.com',
        password: getTestPassword(),
        roles: ['Client', 'Professional'],
        mobile: '9000000004',
        professionalProfile: {
            verified: true,
            tier: 'Gold',
            rating: 4.9,
            reviews: 20,
            points: 1000,
            skills: ['General Carpentry', 'Painting', 'Plumbing'],
        },
    },
];

export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {




        const auth = getAdminAuth();
        const db = getAdminDb();


        // Simple retry helper to handle transient emulator startup/connectivity issues
        const retryAsync = async <T>(fn: () => Promise<T>, attempts = 5, delayMs = 500): Promise<T> => {
            let lastErr: any;
            for (let i = 0; i < attempts; i++) {
                try {
                    return await fn();
                } catch (err: any) {
                    lastErr = err;

                    // If last attempt, break and throw
                    if (i === attempts - 1) break;
                    await new Promise((res) => setTimeout(res, delayMs));
                }
            }
            throw lastErr;
        };

        const now = Timestamp.now();

        const results: Array<{ email: string; uid?: string; created: boolean }> = [];

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
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                roles: user.roles,
                status: 'active',
                isMobileVerified: true,
                kycStatus: 'verified',
                professionalProfile: user.professionalProfile,
                payouts: user.payouts,
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

            results.push({ email: user.email, uid: userRecord.uid, created });
        }



        return NextResponse.json({ success: true, results });
    } catch (error: any) {

        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}
