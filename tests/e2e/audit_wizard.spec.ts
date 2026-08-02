import { test, expect } from '@playwright/test';

test('audit post job wizard', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.getByPlaceholder('name@example.com').fill('rajesh.client@team4job.com');
  await page.getByPlaceholder('••••••••').fill('TestUser_2026!');
  await page.getByRole('button', { name: 'Log In' }).click();

  // Wait for dashboard or direct navigation
  await page.waitForURL('**/dashboard**');
  
  // 2. Go to Post Job
  await page.goto('/dashboard/post-job');
  await page.waitForSelector('text=Job Details');
  await page.screenshot({ path: 'audit_wizard_step1.png' });

  // 3. Fill Form
  await page.click('button:has-text("Select a category")');
  await page.getByRole('option', { name: 'Security & Surveillance' }).click();
  await page.fill('input[placeholder*="Technical Installation"]', 'Smart Home Security Installation');
  await page.fill('textarea[placeholder*="Describe the project requirements"]', 'Install 4 wireless cameras and a central hub. Configure mobile access.');
  await page.fill('input[placeholder*="Smart Devices"]', 'CCTV, Networking, Smart Devices');
  await page.fill('input[placeholder*="110001"]', '110001');

  // Verify checkbox
  await page.getByRole('checkbox', { name: 'I verify that these details are correct.' }).click({ force: true });

  // 4. Post Job
  await page.screenshot({ path: 'audit_wizard_step2.png' });
  await page.click('button:has-text("Post Job")');
});
