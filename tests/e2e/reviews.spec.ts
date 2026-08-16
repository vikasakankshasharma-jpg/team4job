import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';
import { execSync } from 'child_process';

/**
 * E2E Test: Reviews & Ratings
 * Verifies the review flow between Client and Professional
 */

test.describe('Reviews & Ratings E2E', () => {
    test('Client and Professional can review each other', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page);

        console.log('--- START: Reviews & Ratings Test ---');

        // 1. Login as Client (This clears the DB and seeds test users)
        await helper.auth.loginAsClient();

        // 2. Seed a completed job
        console.log('Seeding completed job...');
        let jobId: string;
        try {
            const seedOutput = execSync('npx tsx scripts/seed-completed-job.ts', {
                env: {
                    ...process.env,
                    NEXT_PUBLIC_USE_EMULATOR: 'true',
                    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
                    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
                    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
                    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
                }
            }).toString();
            jobId = seedOutput.trim().replace(/\r/g, '').split('\n').pop()?.trim() || '';
            console.log(`Seeded Job ID: ${jobId}`);
        } catch (error) {
            console.error('Failed to seed completed job', error);
            throw error;
        }
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');
        console.log(`Testing reviews on Job ID: ${jobId}`);

        // 3. Submit Review as Client
        const leaveReviewBtn = page.getByTestId('leave-review-button');
        await expect(leaveReviewBtn).toBeVisible({ timeout: 30000 });
        await leaveReviewBtn.click({ force: true });
        
        // Let's assume the dialog opens and we can just use the rating stars directly
        console.log('Submitting review as Client...');
        const star5 = page.getByTestId('rating-star-5').first();
        await expect(star5).toBeVisible({ timeout: 30000 });
        await star5.click({ force: true });
        
        const reviewInput = page.locator('textarea, input[type="text"]').filter({ hasText: /review|comment/i }).first().or(page.getByTestId('rating-comment'));
        if (await reviewInput.isVisible()) {
            await reviewInput.fill('Test Review: Great work!');
        }
        
        const submitBtn = page.getByTestId('submit-review-button');
        await submitBtn.click({ force: true });

        // Verify Locked/Sealed State appears after successful submission
        await expect(page.getByTestId('review-locked-card')).toBeVisible({ timeout: 30000 });
        console.log('[PASS] Client Review Submitted');

        // 4. Login as Professional to Submit Review
        console.log('Switching to Professional account...');
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');

        // Professional Submit Review
        const proLeaveReviewBtn = page.getByTestId('leave-review-button');
        await expect(proLeaveReviewBtn).toBeVisible({ timeout: 30000 });
        await proLeaveReviewBtn.click({ force: true });
        
        console.log('Submitting review as Professional...');
        const proStar5 = page.getByTestId('rating-star-5').first();
        await expect(proStar5).toBeVisible({ timeout: 30000 });
        await proStar5.click({ force: true });
        
        const proReviewInput = page.locator('textarea, input[type="text"]').filter({ hasText: /review|comment/i }).first().or(page.getByTestId('rating-comment'));
        if (await proReviewInput.isVisible()) {
            await proReviewInput.fill('Test Review: Great Client!');
        }
        
        const proSubmitBtn = page.getByTestId('submit-review-button');
        await proSubmitBtn.click({ force: true });
        
        console.log('[PASS] Professional Review Submitted');

        console.log('--- END: Reviews & Ratings Test ---');

        // 5. Verify Reviews Revealed (UI will update automatically when both are submitted)
        await expect(page.getByTestId('reviews-revealed-section')).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(/Self Assessment/i)).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(/Counterparty Feedback/i)).toBeVisible({ timeout: 30000 });

        console.log('[PASS] Reviews Verified Successfully');
        await context.close();
    });
});



