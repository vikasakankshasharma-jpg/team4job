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

        // 2. Login as Client
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');
        console.log(`Testing reviews on Job ID: ${jobId}`);

        // 3. Submit Review as Client
        const leaveReviewBtn = page.getByTestId('leave-review-button');
        await expect(leaveReviewBtn).toBeVisible({ timeout: 15000 });
        await leaveReviewBtn.click({ force: true });
        
        // Let's assume the dialog opens and we can just use the rating stars directly
        console.log('Submitting review as Client...');
        const star5 = page.locator('.lucide-star').nth(4).or(page.getByTestId('rating-star-5'));
        await expect(star5).toBeVisible({ timeout: 15000 });
        await star5.click({ force: true });
        
        const reviewInput = page.locator('textarea, input[type="text"]').filter({ hasText: /review|comment/i }).first().or(page.getByTestId('rating-comment'));
        if (await reviewInput.isVisible()) {
            await reviewInput.fill('Test Review: Great work!');
        }
        
        const submitBtn = page.getByRole('button', { name: /Submit/i }).first().or(page.getByTestId('submit-review-button'));
        await submitBtn.click({ force: true });

        // Verify Locked/Sealed State
        await expect(page.getByTestId('review-locked-card')).toBeVisible();
        console.log('[PASS] Client Review Submitted');

        // 4. Login as Professional to Submit Review
        console.log('Switching to Professional account...');
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');

        // Professional Submit Review
        const proLeaveReviewBtn = page.getByTestId('leave-review-button');
        await expect(proLeaveReviewBtn).toBeVisible({ timeout: 15000 });
        await proLeaveReviewBtn.click({ force: true });
        
        console.log('Submitting review as Professional...');
        const proStar5 = page.locator('.lucide-star').nth(4).or(page.getByTestId('rating-star-5'));
        await expect(proStar5).toBeVisible({ timeout: 15000 });
        await proStar5.click({ force: true });
        
        const proReviewInput = page.locator('textarea, input[type="text"]').filter({ hasText: /review|comment/i }).first().or(page.getByTestId('rating-comment'));
        if (await proReviewInput.isVisible()) {
            await proReviewInput.fill('Test Review: Great Client!');
        }
        
        const proSubmitBtn = page.getByRole('button', { name: /Submit/i }).first().or(page.getByTestId('submit-review-button'));
        await proSubmitBtn.click({ force: true });

        console.log('[PASS] Professional Review Submitted');

        console.log('--- END: Reviews & Ratings Test ---');

        // 5. Verify Reviews Revealed
        await expect(page.getByTestId('reviews-revealed-section')).toBeVisible({ timeout: TIMEOUTS.medium });
        await expect(page.getByText(/You Rated Them/i)).toBeVisible();
        await expect(page.getByText(/They Rated You/i)).toBeVisible();

        console.log('[PASS] Reviews Verified Successfully');
        await context.close();
    });
});


