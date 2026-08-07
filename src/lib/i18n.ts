export const vi = {
  brand: 'Lộ Trình Việt',
  explore: 'Khám phá',
  dashboard: 'Học tập',
  admin: 'Quản trị',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  register: 'Tạo tài khoản',
  save: 'Lưu thay đổi',
  emptyCourses: 'Chưa có khóa học được xuất bản.',
  continue: 'Tiếp tục học',
  enroll: 'Bắt đầu học',
  complete: 'Hoàn thành bài',
  note: 'Ghi chú riêng',
  bookmark: 'Đánh dấu',
} as const;
export type MessageKey = keyof typeof vi;
export const t = (key: MessageKey) => vi[key];
