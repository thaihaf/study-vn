import { expect, test } from '@playwright/test';

import './document-course-flow.spec';

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const learnerPassword = process.env.SEED_LEARNER_PASSWORD;

if (!adminEmail || !adminPassword || !learnerPassword) {
  throw new Error(
    'Missing deterministic E2E credential environment variables.',
  );
}

test.describe.configure({ retries: 0 });

function runSuffix() {
  return process.env.GITHUB_RUN_ID ?? String(Date.now());
}

test('public landing, navigation and health', async ({ page, request }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Biến mục tiêu/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Khám phá khóa học' }).click();
  await expect(page).toHaveURL(/explore/);

  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
});

test('admin publishes content and learner completes the core journey', async ({
  page,
}) => {
  const suffix = runSuffix();
  const learnerEmail = `e2e-learner+${suffix}@ci.example.test`;
  const courseTitle = `Khóa học kiểm thử E2E ${suffix}`;
  const questionPrompt = `Đâu là đáp án đúng của câu kiểm thử ${suffix}?`;
  const assessmentTitle = `Bài luyện kiểm thử E2E ${suffix}`;

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(adminEmail);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(adminPassword);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/admin(?:$|\/)/);

  await page.goto('/admin/courses/new');
  await page.getByText('Tạo bản nháp thủ công, không dùng AI').click();
  await page.getByLabel('Tên khóa học', { exact: true }).fill(courseTitle);
  await page
    .getByLabel('Mô tả ngắn', { exact: true })
    .fill('Khóa học được tạo tự động để kiểm tra luồng xuất bản đầu cuối.');
  await page.getByLabel('Danh mục', { exact: true }).fill('Kiểm thử');
  await page.getByRole('button', { name: 'Tạo bản nháp' }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/.+\/edit/);
  await expect(page.getByText('Không có lỗi chặn xuất bản.')).toBeVisible();

  await page.getByRole('button', { name: 'Xuất bản ngay' }).click();
  await expect(page.getByText(/PUBLISHED/).first()).toBeVisible();

  await page.goto('/admin/questions');
  const questionCreateForm = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Tạo câu hỏi' }) })
    .first();
  await questionCreateForm.getByLabel('Câu hỏi').fill(questionPrompt);
  await questionCreateForm
    .getByLabel('Lựa chọn / đáp án Đúng-Sai')
    .fill('* Đáp án đúng\nĐáp án sai');
  await questionCreateForm
    .getByLabel('Giải thích')
    .fill('Đáp án đầu tiên được đánh dấu đúng.');
  await questionCreateForm.getByLabel('Trạng thái').selectOption('PUBLISHED');
  await questionCreateForm.getByRole('button', { name: 'Tạo câu hỏi' }).click();
  await expect(
    page.getByRole('heading', { name: questionPrompt }),
  ).toBeVisible();

  await page.goto('/admin/assessments');
  const assessmentCreateForm = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Tạo bài đánh giá' }) })
    .first();
  await assessmentCreateForm.getByLabel('Tên').fill(assessmentTitle);
  await assessmentCreateForm
    .getByLabel('Mô tả')
    .fill('Bài luyện dùng trong kiểm thử đầu cuối.');
  await assessmentCreateForm
    .getByRole('button', { name: 'Tạo bài đánh giá' })
    .click();
  await expect(page).toHaveURL(/\/admin\/assessments\?created=/);
  await expect(page.getByRole('status')).toContainText('Đã tạo bài đánh giá');

  const assessmentCard = page.getByRole('article', {
    name: `Bài đánh giá: ${assessmentTitle}`,
  });
  await expect(assessmentCard).toBeVisible();

  const questionSelect = assessmentCard.locator('select[name="questionId"]');
  const optionLabel = `SINGLE_CHOICE · ${questionPrompt.slice(0, 90)}`;
  await questionSelect.selectOption({ label: optionLabel });
  await assessmentCard.getByRole('button', { name: 'Thêm câu' }).click();
  await expect(
    assessmentCard.locator('ol > li').filter({ hasText: questionPrompt }),
  ).toBeVisible();

  await assessmentCard.getByRole('button', { name: 'Xuất bản' }).click();
  await expect(
    assessmentCard.getByRole('button', { name: 'Gỡ xuất bản' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/register');
  await page.getByLabel('Tên của bạn').fill('E2E Learner');
  await page.getByLabel('Email', { exact: true }).fill(learnerEmail);
  await page.getByLabel(/Mật khẩu/).fill(learnerPassword);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/explore');
  await page.getByRole('link', { name: new RegExp(courseTitle) }).click();
  await page.getByRole('button', { name: 'Bắt đầu học' }).click();
  await page.getByRole('link', { name: /^Tiếp tục:/ }).click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page.getByRole('heading', { name: 'Bài học 1' })).toBeVisible();

  await page.getByLabel('Ghi chú riêng').fill('Ghi chú E2E của người học.');
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click();
  await page.getByRole('button', { name: 'Đánh dấu', exact: false }).click();
  await page.getByRole('button', { name: 'Hoàn thành bài' }).click();
  await expect(
    page.getByRole('button', { name: '✓ Đã hoàn thành' }),
  ).toBeVisible();

  await page.goto('/notes');
  await expect(page.getByText('Ghi chú E2E của người học.')).toBeVisible();
  await page.goto('/bookmarks');
  await expect(page.getByText('Bài học 1')).toBeVisible();

  await page.goto('/practice');
  await page.getByRole('link', { name: new RegExp(assessmentTitle) }).click();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await page.getByLabel('Đáp án đúng').check();
  await page.getByRole('button', { name: 'Nộp bài' }).click();
  await expect(
    page.getByRole('heading', { name: /Kết quả: 100%/ }),
  ).toBeVisible();
  await expect(page.getByText('✓ Chính xác')).toBeVisible();
});
