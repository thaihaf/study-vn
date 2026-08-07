import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@ci.example.test';
const adminPassword =
  process.env.SEED_ADMIN_PASSWORD ?? 'AdminPassword123!';
const learnerEmail = process.env.SEED_LEARNER_EMAIL;
const learnerPassword = process.env.SEED_LEARNER_PASSWORD;

async function expectNoBlockingA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  );
  const diagnostic = blocking.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target),
  }));

  expect(blocking, JSON.stringify(diagnostic, null, 2)).toEqual([]);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

for (const route of ['/', '/explore', '/login', '/register']) {
  test(`accessibility: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expectNoBlockingA11yViolations(page);
  });
}

test('accessibility: admin dashboard', async ({ page }) => {
  await login(page, adminEmail, adminPassword);
  await expect(page).toHaveURL(/\/admin(?:$|\/)/);
  await expectNoBlockingA11yViolations(page);
});

test('accessibility: learner dashboard', async ({ page }) => {
  test.skip(
    !learnerEmail || !learnerPassword,
    'SEED_LEARNER_EMAIL/PASSWORD are required for authenticated learner scan.',
  );

  await login(page, learnerEmail!, learnerPassword!);
  await expect(page).toHaveURL(/\/dashboard/);
  await expectNoBlockingA11yViolations(page);
});
