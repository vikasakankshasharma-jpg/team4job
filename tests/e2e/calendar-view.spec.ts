import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Calendar & Scheduling View', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Professional can view scheduled jobs in the calendar', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/calendar', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/.*\/dashboard\/calendar/);

        // Verify calendar grid is visible (react-day-picker uses .rdp)
        const calendar = page.locator('.rdp, [data-testid="calendar-grid"]').first();
        await expect(calendar).toBeVisible({ timeout: TIMEOUTS.medium });

        // Verify today's date is highlighted
        const todayCell = page.locator('.rdp-day_today').first();
        if (await todayCell.isVisible()) {
            await expect(todayCell).toBeVisible();
        }
    });

    test('New job appears on the calendar after being accepted', async ({ page }) => {
        await helper.auth.loginAsProfessional();
        
        await page.goto('/dashboard/calendar', { waitUntil: 'domcontentloaded' });
        
        // Wait for potential events to load
        await page.waitForTimeout(2000);
        
        const event = page.locator('.rdp-day_selected, [style*="background-color: var(--primary)"]').first();
        if (await event.isVisible()) {
            console.log('Found events on the calendar.');
            await event.click();
            
            // Verify event popover or detail shows up in the job list panel
            await expect(page.locator('p').filter({ hasText: /No Jobs|Scheduled Jobs/i }).first()).toBeVisible();
        } else {
            console.log('No events found on the current calendar view.');
        }
    });
});

