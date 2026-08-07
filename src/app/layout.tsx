import type { Metadata } from 'next';
import './globals.css';
import './mvp.css';
import { Header } from '@/components/shared/header';

export const metadata: Metadata = {
  title: { default: 'Lộ Trình Việt', template: '%s · Lộ Trình Việt' },
  description: 'Nền tảng học theo lộ trình, tiếng Việt và tập trung.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <a className="sr-only focus:not-sr-only" href="#main">Chuyển đến nội dung</a>
        <Header />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
