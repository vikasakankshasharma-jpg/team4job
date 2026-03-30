import { test, expect } from '@playwright/test';

test('audit post job wizard', async ({ page }) => {
  // 1. Login
  await page.goto('https://www.team4job.com/login');
  await page.fill('input[type="email"]', 'rajesh.client@team4job.com');
  await page.fill('input[type="password"]', 'TestUser_2026!');
  await page.click('button[type="submit"]');

  // Wait for dashboard or direct navigation
  await page.waitForURL('**/dashboard**');
  
  // 2. Go to Post Job
  await page.goto('https://www.team4job.com/dashboard/post-job');
  await page.waitForSelector('text=Job Details');
  await page.screenshot({ path: 'audit_wizard_step1.png' });

  // 3. Fill Step 1
  await page.click('button:has-text("Select a category")');
  await page.click('text=Security Systems');
  await page.fill('input[placeholder*="Job Title"]', 'Smart Home Security Installation');
  await page.fill('textarea[placeholder*="Describe the project"]', 'Install 4 wireless cameras and a central hub. Configure mobile access.');
  await page.fill('input[placeholder*="Skills"]', 'CCTV, Networking, Smart Devices');
  await page.click('button:has-text("Next")');

  // 4. Verify Step 2
  await page.waitForSelector('text=Location');
  await page.screenshot({ path: 'audit_wizard_step2.png' });
  await page.fill('input[placeholder*="Pincode"]', '110001');
  await page.click('button:has-text("Next")');

  // 5. Verify Step 3
  await page.waitForSelector('text=Budget');
  await page.screenshot({ path: 'audit_wizard_step3.png' });
});
