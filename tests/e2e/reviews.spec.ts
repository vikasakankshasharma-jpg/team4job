import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

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

        // 1. Login as Job Giver to find a Completed Job
        await helper.auth.loginAsJobGiver();
        await page.goto('/dashboard/posted-jobs?tab=archived');

        // Check for completed jobs
        const completedJobCard = page.locator('[data-testid="job-card-completed"]').first();

        if (await completedJobCard.count() === 0) {
            console.log('WARNING: No completed jobs found. Skipping reviews test. Run complete-transaction-cycle first.');
            return;
        }

        // Open the job
        await completedJobCard.click();
        await helper.job.waitForJobStatus('Completed');
        const jobId = await helper.job.getJobIdFromUrl();
        console.log(`Testing reviews on Job ID: ${jobId}`);

        // 2. Submit Review as Job Giver (if not already done)
        const reviewSection = page.getByText('Rate Your Experience');

        if (await reviewSection.isVisible()) {
            console.log('Submitting review as Job Giver...');
            await page.getByTestId('rating-star-5').click();
            await page.getByTestId('rating-comment').fill('Test Review: Great work!');
            await page.getByTestId('submit-review-button').click();

            // Verify Locked/Sealed State
            await expect(page.getByTestId('review-locked-card')).toBeVisible();
            console.log('[PASS] Job Giver Review Submitted');
        } else if (await page.getByTestId('reviews-revealed-section').isVisible()) {
            console.log('Reviews already revealed for this job.');
        } else {
            console.log('Review already submitted or not visible.');
        }

        // 3. Login as Installer to Submit Review
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');

        const installerReviewSection = page.getByText('Rate Your Experience');

        if (await installerReviewSection.isVisible()) {
            console.log('Submitting review as Installer...');

            // Verify specific messaging
            await expect(page.getByText('The other party has already reviewed you')).toBeVisible();

            await page.getByTestId('rating-star-5').click();
            await page.getByTestId('rating-comment').fill('Test Review: Great client!');
            await page.getByTestId('submit-review-button').click();
            console.log('[PASS] Installer Review Submitted');
        }

        // 4. Verify Reviews Revealed
        await expect(page.getByTestId('reviews-revealed-section')).toBeVisible({ timeout: TIMEOUTS.medium });
        await expect(page.getByText('You Rated Them')).toBeVisible();
        await expect(page.getByText('They Rated You')).toBeVisible();

        console.log('[PASS] Reviews Verified Successfully');
        await context.close();
    });
});
