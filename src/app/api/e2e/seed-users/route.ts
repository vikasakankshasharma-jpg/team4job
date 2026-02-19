import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const isE2eAllowed = () => {
    const emulatorEnabled =
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
        process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

    if (emulatorEnabled) return true;
    if (process.env.ALLOW_E2E_SEED === 'true') return true;
    if (process.env.NODE_ENV !== 'production') return true;

    return false;
};

const TEST_USERS = [
    {
        name: 'Test Job Giver',
        email: 'giver_vip_v3@team4job.com',
        password: 'Test@1234',
        roles: ['Job Giver'],
        mobile: '9000000001',
    },
    {
        name: 'Test Installer',
        email: 'installer_pro_v3@team4job.com',
        password: 'Test@1234',
        roles: ['Installer'],
        mobile: '9000000002',
        installerProfile: {
            verified: true,
            tier: 'Silver',
            rating: 4.8,
            reviews: 12,
            points: 500,
            skills: ['CCTV Installation', 'Wiring', 'DVR Setup'],
        },
        payouts: {
            beneficiaryId: 'TEST_BENE_INSTALLER',
            accountHolderName: 'Test Installer',
            accountNumberMasked: '**** 1234',
            ifsc: 'TEST0001234',
        },
    },
    {
        name: 'Test Admin',
        email: 'vikasakankshasharma_v3@gmail.com',
        password: 'Vks2bhdj@9229',
        roles: ['Admin'],
        mobile: '9000000003',
    },
];

export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        logger.info('[E2E-SEED] Starting seed-users request...');
        logger.info('[E2E-SEED] Env check - FIRESTORE_EMULATOR_HOST', {
            FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
        });
        logger.info('[E2E-SEED] Env check - FIREBASE_AUTH_EMULATOR_HOST', {
            FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
        });
        
        logger.info('[E2E-SEED] Getting Auth and Firestore instances...');
        const auth = getAdminAuth();
        const db = getAdminDb();
        logger.info('[E2E-SEED] ✓ Got Auth and Firestore instances');

        // Simple retry helper to handle transient emulator startup/connectivity issues
        const retryAsync = async <T>(fn: () => Promise<T>, attempts = 5, delayMs = 500): Promise<T> => {
            let lastErr: any;
            for (let i = 0; i < attempts; i++) {
                try {
                    return await fn();
                } catch (err: any) {
                    lastErr = err;
                    logger.warn(`[E2E-SEED] Attempt ${i + 1}/${attempts} failed: ${err?.message || err}`);
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
                } catch (err) {
                    // If getUserByEmail failed (not found or connection), attempt create
                    userRecord = await retryAsync(() =>
                        auth.createUser({
                            email: user.email,
                            password: user.password,
                            displayName: user.name,
                            emailVerified: true,
                        })
                    );
                    created = true;
                }
            } catch (innerErr) {
                // propagate to outer catch after logging
                logger.error('[E2E-SEED] Failed to create/get user', { email: user.email, err: innerErr });
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
                installerProfile: user.installerProfile,
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

        logger.info('[E2E] Seeded test users', { results });

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        logger.error('[E2E] Seed users failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
