// domains/users/user.service.ts

import { userRepository } from './user.repository';

import { User, UpdateProfileInput, ProfessionalFilters, Role, ProfessionalOnboardingInput } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

export class UserService {
    async getProfile(userId: string): Promise<User> {
        // Add timeout to prevent SSR hangs
        const user = await Promise.race([
            userRepository.fetchById(userId),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Fetch user profile timeout')), 10000))
        ]);

        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async updateProfile(userId: string, data: UpdateProfileInput): Promise<void> {
        const user = await userRepository.fetchById(userId);
        if (!user) throw new Error('User not found');

        const updates: any = {};
        const securityAlerts: string[] = [];

        // 1. Handle Name Change
        if (data.name && data.name !== user.name) {
            if (data.name.trim().length < 2) throw new Error('Name too short');
            updates.name = data.name;
        }

        // 2. Handle Address Changes
        if (data.addresses) {
            updates.addresses = {
                ...user.addresses,
                residence: data.addresses.residence || user.addresses?.residence,
                office: data.addresses.office || user.addresses?.office,
            };
            securityAlerts.push("Address details were updated.");
        }

        // 3. Handle Mobile Change (with Cooling Period)
        if (data.mobile && data.mobile !== user.mobile) {
            if (!this.isValidMobile(data.mobile)) throw new Error('Invalid mobile number');
            
            const oldMobile = user.mobile;
            updates.mobile = data.mobile;
            updates.isMobileVerified = false;
            updates.restrictedUntil = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
            
            const { sendWhatsAppTemplate } = await import("@/lib/whatsapp");
            if (oldMobile) {
                await sendWhatsAppTemplate(oldMobile, "security_alert", ["Mobile Number Change", "Your mobile number is being changed."]);
            }
            await sendWhatsAppTemplate(data.mobile, "security_alert", ["Mobile Number Change", "Your mobile number has been updated. A 48-hour cooling period is active."]);
            securityAlerts.push("Mobile number was changed. 48-hour cooling period applied.");
        }

        // 4. Handle Email Change (with Cooling Period)
        if (data.email && data.email !== user.email) {
            const oldEmail = user.email;
            updates.email = data.email;
            updates.isEmailVerified = false;
            updates.restrictedUntil = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));

            const { getAdminAuth } = await import("@/infrastructure/firebase/admin");
            const auth = getAdminAuth();
            await auth.updateUser(userId, { email: data.email, emailVerified: false });

            const { sendNotification } = await import("@/lib/notifications");
            if (oldEmail) {
                await sendNotification(oldEmail, "Security Alert: Email Changed", `Your Team4Job account email is being changed to ${data.email}.`);
            }
            await sendNotification(data.email, "Security Alert: Email Changed", `Your Team4Job account email has been updated.`);
            securityAlerts.push("Email address was changed. 48-hour cooling period applied.");
        }

        // 5. GSTIN
        if (data.gstin !== undefined && data.gstin !== (user.gstin || "")) {
            updates.gstin = data.gstin;
            securityAlerts.push("GSTIN details were updated.");
        }

        // 6. Apply Updates
        if (Object.keys(updates).length > 0) {
            await userRepository.update(userId, updates);

            // In-App Notification
            if (securityAlerts.length > 0) {
                const db = (await import('@/infrastructure/firebase/admin')).getAdminDb();
                await db.collection("notifications").add({
                    userId,
                    type: "SECURITY_ALERT",
                    title: "Profile Security Update",
                    message: securityAlerts.join(" "),
                    createdAt: Timestamp.now(),
                    read: false,
                    priority: "high"
                });
            }
        }
    }

    async verifyProfessional(professionalId: string, adminId: string): Promise<void> {
        const user = await userRepository.fetchById(professionalId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.roles?.includes('Professional')) {
            throw new Error('User is not an Professional');
        }

        await userRepository.update(professionalId, {
            professionalProfile: {
                ...user.professionalProfile,
                verified: true,
                verificationLevel: 'Basic',
            } as any,
        });


    }

    async listProfessionals(filters?: ProfessionalFilters): Promise<User[]> {
        return userRepository.queryProfessionals(filters);
    }

    /**
     * List Professionals with pagination support
     * @param limit - Number of Professionals to fetch
     * @param lastMemberSince - Cursor for pagination
     * @param verified - Filter by verified status
     */
    async listProfessionalsWithPagination(limit = 50, lastMemberSince?: Date, verified = true): Promise<User[]> {
        return userRepository.fetchProfessionals(limit, lastMemberSince, verified);
    }

    async getPublicProfiles(userIds: string[]): Promise<Map<string, any>> {
        return userRepository.fetchPublicProfiles(userIds);
    }

    /**
     * Recalculates all user counters by scanning jobs and transactions
     * Use sparingly for reconciliation
     */
    async recalculateUserStats(userId: string): Promise<Record<string, number>> {
        const db = (await import('@/infrastructure/firebase/admin')).getAdminDb();

        // 1. Count Jobs (Active, Completed, Won)
        const jobsSnap = await db.collection('jobs')
            .where('clientId', '==', userId)
            .get();

        const awardedSnap = await db.collection('jobs')
            .where('awardedProfessionalId', '==', userId)
            .get();

        const stats = {
            activeJobs: 0,
            completedJobs: 0,
            jobsWon: 0,
            totalBids: 0,
            myBids: 0,
            totalEarnings: 0
        };

        // Client logic
        jobsSnap.docs.forEach(doc => {
            const status = doc.data().status;
            if (['open', 'in_progress', 'funded', 'work_submitted'].includes(status.toLowerCase())) {
                stats.activeJobs++;
            } else if (status.toLowerCase() === 'completed') {
                stats.completedJobs++;
            }
        });

        // Professional logic
        awardedSnap.docs.forEach(doc => {
            const status = doc.data().status;
            stats.jobsWon++;
            if (['in_progress', 'funded', 'work_submitted'].includes(status.toLowerCase())) {
                stats.activeJobs++;
            } else if (status.toLowerCase() === 'completed') {
                stats.completedJobs++;
                // Sum earnings
                const bids = doc.data().bids || [];
                const myBid = bids.find((b: any) => (b.professionalId === userId || b.professional === userId));
                if (myBid) stats.totalEarnings += (myBid.amount || 0);
            }
        });

        // 2. Count Bids
        const bidsSnap = await db.collectionGroup('bids')
            .where('professionalId', '==', userId)
            .get();
        stats.myBids = bidsSnap.size;

        // 3. Update Repository
        await userRepository.update(userId, stats as any);


        return stats;
    }

    async submitProfessionalOnboarding(userId: string, data: ProfessionalOnboardingInput): Promise<void> {
        const { getAdminStorage } = await import('@/infrastructure/firebase/admin');
        const storage = getAdminStorage();
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dodo-beta.firebasestorage.app');

        const uploadedUrls: Record<string, string> = {};

        // 1. Upload Files
        for (const [key, fileData] of Object.entries(data.files)) {
            if (fileData && fileData.buffer) {
                const fileName = `kyc/${userId}/${key}_${Date.now()}.${fileData.name.split('.').pop()}`;
                const fileRef = bucket.file(fileName);

                await fileRef.save(fileData.buffer, {
                    metadata: { contentType: fileData.type },
                });

                await fileRef.makePublic();
                uploadedUrls[key] = fileRef.publicUrl();
            }
        }

        // 2. Update User Profile using repository
        await userRepository.update(userId, {
            name: `${data.firstName} ${data.lastName}`.trim(),
            address: {
                cityPincode: data.pincode,
                city: data.city,
            } as any,
            professionalProfile: {
                shopName: data.shopName,
                experience: data.experience,
                skills: data.skills,
                verificationStatus: "verified",
                verified: true,
                documents: uploadedUrls,
                submittedAt: Timestamp.now(),
            } as any,
            realAvatarUrl: uploadedUrls.profilePhoto || undefined,
        } as any);
    }

    private isValidMobile(mobile: string): boolean {
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(mobile.replace(/\D/g, ''));
    }
}

export const userService = new UserService();
