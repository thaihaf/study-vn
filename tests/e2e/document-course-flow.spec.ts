import { expect, test } from '@playwright/test';

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const learnerEmail = process.env.SEED_LEARNER_EMAIL;
const learnerPassword = process.env.SEED_LEARNER_PASSWORD;

if (!adminEmail || !adminPassword || !learnerEmail || !learnerPassword) {
  throw new Error('Missing deterministic E2E credential environment variables.');
}

test.describe.configure({ retries: 0 });

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

test('document AI infers the whole draft, then learner can enroll and study', async ({
  page,
}) => {
  const courseTitle = 'Khóa học tài liệu E2E';

  await login(page, adminEmail, adminPassword);
  await expect(page).toHaveURL(/\/admin(?:$|\/)/);

  await page.goto('/admin/courses/new');
  await expect(page.getByLabel('Tên khóa học cho AI')).toHaveCount(0);
  await expect(page.getByLabel('Danh mục khóa học AI')).toHaveCount(0);
  await page.getByLabel('Tài liệu để AI nghiên cứu').setInputFiles({
    name: 'nguon-kiem-thu.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Tài liệu kiểm thử\n\nCore Banking xử lý dữ liệu và giao dịch cốt lõi. ACID giúp bảo đảm tính nhất quán. Open Banking sử dụng API có kiểm soát để tích hợp với bên thứ ba. Nội dung này chỉ dùng cho kiểm thử E2E.',
      'utf8',
    ),
  });
  await page
    .getByLabel('Yêu cầu thêm cho AI', { exact: false })
    .fill('Ưu tiên ví dụ thực tế và câu hỏi phỏng vấn.');
  await page
    .getByRole('button', { name: 'AI tạo bản nháp để tôi review' })
    .click();

  await expect(page).toHaveURL(/\/admin\/courses\/.+\/edit/, { timeout: 120_000 });
  await expect(page.getByText(courseTitle).first()).toBeVisible();
  await expect(page.getByText('Module 1: Nền tảng kiểm thử')).toBeVisible();
  await expect(page.getByText('Module 3: Nền tảng kiểm thử')).toBeVisible();
  await expect(page.getByText('Bài 9: Kiến thức từ tài liệu')).toBeVisible();
  await expect(page.getByText('Nội dung có thể chỉnh sửa.')).toHaveCount(0);

  const moduleOne = page.locator('.builder-module').first();
  await expect(moduleOne.locator('input[type="number"]')).not.toHaveValue('');
  await expect(moduleOne.getByLabel(/Mục tiêu học tập/)).not.toHaveValue('');
  const firstLesson = moduleOne.locator('.builder-lesson').first();
  await expect(firstLesson.getByLabel('Mô tả bài')).not.toHaveValue('');
  await expect(firstLesson.getByLabel(/Mục tiêu bài học/)).not.toHaveValue('');

  await page.getByRole('button', { name: 'Xuất bản ngay' }).click();
  await expect(page.getByText(/PUBLISHED/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page, learnerEmail, learnerPassword);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/explore');
  await page.getByRole('link', { name: new RegExp(courseTitle) }).click();
  await page.getByRole('button', { name: 'Bắt đầu học' }).click();
  await page.getByRole('link', { name: /^Tiếp tục:/ }).click();

  await expect(page).toHaveURL(/\/learn\//);
  await expect(
    page.getByRole('heading', { name: 'Bài 1: Kiến thức từ tài liệu' }),
  ).toBeVisible();
  await expect(page.getByText('Ví dụ thực tế')).toBeVisible();
  await expect(page.getByText('Tình huống')).toBeVisible();
  await expect(page.getByText('Câu hỏi phỏng vấn')).toBeVisible();
  await expect(page.getByText('Tóm tắt')).toBeVisible();
  await expect(page.getByText('Nội dung có thể chỉnh sửa.')).toHaveCount(0);

  await page.getByLabel('Ghi chú riêng').fill('Ghi chú từ khóa học AI E2E.');
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click();
  await page.getByRole('button', { name: 'Đánh dấu', exact: false }).click();
  await page.getByRole('button', { name: 'Hoàn thành bài' }).click();
  await expect(
    page.getByRole('button', { name: '✓ Đã hoàn thành' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Bài sau →' }).click();
  await expect(
    page.getByRole('heading', { name: 'Bài 2: Kiến thức từ tài liệu' }),
  ).toBeVisible();
});
