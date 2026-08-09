import { test, expect } from '@playwright/test';
import { TestHelper } from './../utils/helpers';

test('audit post job wizard', async ({ page }) => {
  const helper = new TestHelper(page);

  // 1. Login
  await helper.auth.loginAsClient();
  
  // 2. Go to Post Job (Wizard)
  await helper.nav.goToPostJob();
  
  // Wait for Wizard
  await expect(page.getByRole('heading', { name: /Mission Orientation/i }).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: 'audit_wizard_step1.png' });

  // 3. Fill Form (Category -> Method -> Questions)
  await page.locator('[data-testid="Security & Surveillance-category-card"]').click();
  await page.getByText('Step-by-Step').click();
  
  const nextButton = page.getByTestId('wizard-next-button');
  while (await nextButton.isVisible().catch(() => false)) {
      const firstOption = page.locator('[data-testid^="question-option-"]').first();
      if (await firstOption.isVisible().catch(() => false)) {
          await firstOption.click();
      }
      const visibleInputs = await page.locator('input[type="text"]:visible').all();
      for (const input of visibleInputs) {
          await input.fill('Test input');
      }
      await nextButton.click();
      await page.waitForTimeout(500);
  }

  // 4. Review Step (Post Job)
  const publishButton = page.getByRole('button', { name: /Looks Good/i });
  await publishButton.waitFor({ state: 'visible', timeout: 120000 });
  await page.screenshot({ path: 'audit_wizard_step2.png' });
  await publishButton.click();
});
