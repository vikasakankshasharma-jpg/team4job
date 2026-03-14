import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';
import { execSync } from 'child_process';

/**
 * E2E Test: Reviews & Ratings
 * Verifies the review flow between Job Giver and Installer
 */

test.describe('Reviews & Ratings E2E', () => {
    test('Job Giver and Installer can review each other', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page);

        console.log('--- START: Reviews & Ratings Test ---');

        // 1. Seed a completed job
        console.log('Seeding completed job...');
        let jobId: string;
        try {
            const seedOutput = execSync('npx tsx scripts/seed-completed-job.ts').toString();
            jobId = seedOutput.trim().split('\n').pop() || '';
            console.log(`Seeded Job ID: ${jobId}`);
        } catch (error) {
            console.error('Failed to seed completed job', error);
            throw error;
        }

        // 2. Login as Job Giver
        await helper.auth.loginAsJobGiver();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');
        console.log(`Testing reviews on Job ID: ${jobId}`);

        // 3. Submit Review as Job Giver
        const reviewSection = page.getByText('Rate Your Experience');
        await expect(reviewSection).toBeVisible({ timeout: 15000 });

        console.log('Submitting review as Job Giver...');
        await page.getByTestId('rating-star-5').click();
        await page.getByTestId('rating-comment').fill('Test Review: Great work!');
        await page.getByTestId('submit-review-button').click();

        // Verify Locked/Sealed State
        await expect(page.getByTestId('review-locked-card')).toBeVisible();
        console.log('[PASS] Job Giver Review Submitted');

        // 4. Login as Installer to Submit Review
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');

        const installerReviewSection = page.getByText('Rate Your Experience');
        await expect(installerReviewSection).toBeVisible({ timeout: 15000 });

        console.log('Submitting review as Installer...');

        // Verify specific messaging (The other party has already reviewed you)
        // Note: The wording might be slightly different or localized, but let's check for the core idea
        await expect(page.getByText(/other party has already reviewed/i)).toBeVisible();

        await page.getByTestId('rating-star-5').click();
        await page.getByTestId('rating-comment').fill('Test Review: Great client!');
        await page.getByTestId('submit-review-button').click();
        console.log('[PASS] Installer Review Submitted');

        // 5. Verify Reviews Revealed
        await expect(page.getByTestId('reviews-revealed-section')).toBeVisible({ timeout: TIMEOUTS.medium });
        await expect(page.getByText(/You Rated Them/i)).toBeVisible();
        await expect(page.getByText(/They Rated You/i)).toBeVisible();

        console.log('[PASS] Reviews Verified Successfully');
        await context.close();
    });
});
