// domains/users/user.service.ts

import { userRepository } from './user.repository';
import { User, UpdateProfileInput, InstallerFilters } from './user.types';
import { logger } from '@/infrastructure/logger';
import { Role } from '@/lib/types';

export class UserService {
    async getProfile(userId: string): Promise<User> {
        const user = await userRepository.fetchById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async updateProfile(userId: string, updates: UpdateProfileInput): Promise<void> {
        // Validate updates
        if (updates.name && updates.name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters');
        }

        if (updates.mobile && !this.isValidMobile(updates.mobile)) {
            throw new Error('Invalid mobile number');
        }

        await userRepository.update(userId, updates);
        logger.userActivity(userId, 'profile_updated', { fields: Object.keys(updates) });
    }

    async verifyInstaller(installerId: string, adminId: string): Promise<void> {
        const user = await userRepository.fetchById(installerId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'Installer') {
            throw new Error('User is not an installer');
        }

        await userRepository.update(installerId, {
            verificationStatus: 'Verified',
        });

        logger.adminAction(adminId, 'installer_verified', installerId);
    }

    async listInstallers(filters?: InstallerFilters): Promise<User[]> {
        return userRepository.queryInstallers(filters);
    }

    /**
     * List installers with pagination support
     * @param limit - Number of installers to fetch
     * @param lastMemberSince - Cursor for pagination
     * @param verified - Filter by verified status
     */
    async listInstallersWithPagination(limit = 50, lastMemberSince?: Date, verified = true): Promise<User[]> {
        return userRepository.fetchInstallers(limit, lastMemberSince, verified);
    }

    async getPublicProfiles(userIds: string[]): Promise<Map<string, any>> {
        return userRepository.fetchPublicProfiles(userIds);
    }

    private isValidMobile(mobile: string): boolean {
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(mobile.replace(/\D/g, ''));
    }
}

export const userService = new UserService();
