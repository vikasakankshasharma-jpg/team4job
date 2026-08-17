
import { test } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { getDateString, getDateTimeString } from '../../fixtures/test-data';

/**
 * Audit Chunk 2: Job Posting
 * Role: Client (Priya VIP Giver)
 * Responsibility: Complete the wizard and submit a new job that matches professional skills.
 */
test.describe('Audit Chunk 2: Job Posting', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });
    test.describe.configure({ mode: 'serial' });

    test('Client posts a matching CCTV job', async ({ page }) => {
        const helper = new TestHelper(page);
        const { uniqueTitle } = TestState.load();
        
        if (!uniqueTitle) throw new Error('No uniqueTitle found in state. Run Chunk 1 first.');

        console.log(`--- CHUNK 2: Client Posts Job (${uniqueTitle}) ---`);
        
        // 1. Login
        await helper.auth.login('giver_vip_v3@team4job.com', 'TestUser_2026!');
        await helper.auth.ensureRole('Client');
        
        // 🚦 RECOVERY LOGIC: Check if job already exists (idempotency)
        await page.goto('/dashboard/jobs');
        await helper.auth.waitForStability();
        const existingJobLink = page.locator('a').filter({ hasText: uniqueTitle }).first();
        
        if (await existingJobLink.isVisible()) {
            console.log(`[Chunk 2] Job "${uniqueTitle}" already exists. Recovering ID...`);
            const href = await existingJobLink.getAttribute('href');
            const jobId = href?.split('/').pop();
            if (jobId) {
                TestState.save({ jobId });
                console.log(`[Chunk 2] Recovered Job ID: ${jobId}`);
                return;
            }
        }

        // 2. Post Job Wizard
        await helper.auth.waitForStability();
        await page.goto('/');
        await helper.form.completeWizard(
            'Security & Surveillance',
            'CCTV / Video Surveillance',
            [
                '5-8 Points', 
                'Both Indoor & Outdoor', 
                'Commercial / Office', 
                'No, needs fresh wiring', 
                '1 Month or more', 
                'Not needed', 
                'Both Mobile & Monitor'
            ],
            'Within 1-2 Days'
        );
        
        // --- HARDENING: Wait for form to stabilize after wizard redirect ---
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();
        
        // Fill Post Job Details
        await helper.form.fillInput('Job Title', uniqueTitle);
        await helper.form.fillTextarea('Job Description', 'Master Audit Job spanning multiple acts. Requires expert CCTV skills and professional certification for verification testing.');
        
        await page.fill('input[name="skills"]', 'CCTV, Audit-Testing');
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', 'Audit Mansion, Bangalore');
        
        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        await page.fill('[data-testid="min-budget-input"]', '5000');
        await page.fill('[data-testid="max-budget-input"]', '7000');

        console.log('[Chunk 2] Submitting job...');
        await helper.form.submitPostJob();
        
        // Finalize and save jobId
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: 9720000 });
        const jobId = await helper.job.getJobIdFromUrl();
        
        TestState.save({ jobId });
        console.log(`✅ Chunk 2 Complete: Job posted (${jobId}).`);
    });
});
