import { expect, test } from '@playwright/test';

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@ci.example.test';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminPassword123!';

function runSuffix(retry: number) {
  return `${process.env.GITHUB_RUN_ID ?? Date.now()}-${retry}`;
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
}, testInfo) => {
  const suffix = runSuffix(testInfo.retry);
  const learnerEmail = `e2e-learner+${suffix}@ci.example.test`;
  const learnerPassword = 'LearnerPassword123!';
  const courseTitle = `Khóa học kiểm thử E2E ${suffix}`;
  const questionPrompt = `Đâu là đáp án đúng của câu kiểm thử ${suffix}?`;
  const assessmentTitle = `Bài luyện kiểm thử E2E ${suffix}`;

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(adminEmail);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(adminPassword);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/admin(?:$|\/)/, { timeout: 15_000 });

  await page.goto('/admin/courses/new');
  await page.getByLabel('Tên khóa học').fill(courseTitle);
  await page
    .getByLabel('Mô tả ngắn')
    .fill('Khóa học được tạo tự động để kiểm tra luồng xuất bản đầu cuối.');
  await page.getByLabel('Danh mục').fill('Kiểm thử');
  await page.getByRole('button', { name: 'Tạo bản nháp' }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/.+\/edit/, {
    timeout: 15_000,
  });
  await expect(page.getByText('Không có lỗi chặn xuất bản.')).toBeVisible({
    timeout: 15_000,
  });

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xuất bản ngay' }).click();
  await expect(page.getByText(/PUBLISHED/).first()).toBeVisible({
    timeout: 15_000,
  });

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
  await expect(page.getByRole('heading', { name: questionPrompt })).toBeVisible(
    { timeout: 15_000 },
  );

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

  const assessmentCard = page
    .locator('article.card')
    .filter({ hasText: assessmentTitle });
  await expect(assessmentCard).toBeVisible({ timeout: 15_000 });
  await assessmentCard
    .locator('select[name="questionId"]')
    .selectOption({ index: 1 });
  await assessmentCard.getByRole('button', { name: 'Thêm câu' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await assessmentCard.getByRole('button', { name: 'Xuất bản' }).click();
  await expect(assessmentCard.getByText('Đã xuất bản')).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL('/', { timeout: 15_000 });

  await page.goto('/register');
  await page.getByLabel('Tên của bạn').fill('E2E Learner');
  await page.getByLabel('Email', { exact: true }).fill(learnerEmail);
  await page.getByLabel(/Mật khẩu/).fill(learnerPassword);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto('/explore');
  await page.getByRole('link', { name: new RegExp(courseTitle) }).click();
  await page.getByRole('button', { name: 'Bắt đầu học' }).click();
  await page.getByRole('link', { name: /^Tiếp tục:/ }).click();
  await expect(page.getByRole('heading', { name: 'Bài học 1' })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel('Ghi chú riêng').fill('Ghi chú E2E của người học.');
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click();
  await page.getByRole('button', { name: 'Đánh dấu', exact: false }).click();
  await page.getByRole('button', { name: 'Hoàn thành bài' }).click();
  await expect(
    page.getByRole('button', { name: '✓ Đã hoàn thành' }),
  ).toBeVisible({ timeout: 15_000 });

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
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('✓ Chính xác')).toBeVisible();
});
