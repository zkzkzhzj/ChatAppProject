import { Gowun_Dodum, IBM_Plex_Sans_KR } from 'next/font/google';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const gowunDodum = Gowun_Dodum({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-gowun',
  display: 'swap',
});

const ibmPlexSansKR = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ghworld',
  description: '마음의 고향',
  openGraph: {
    title: 'ghworld',
    description: '마음의 고향',
    type: 'website',
  },
};

/**
 * 모바일 가상 키보드 안정화 (Step 1.7).
 * - interactiveWidget='resizes-content' — 키보드 표시 시 viewport 줄임 → 하단 도크 input 결 가려짐 결 X.
 * - maximum-scale=1 — 입력 focus 시 자동 zoom-in 결 (iOS Safari) 차단.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${ibmPlexSansKR.variable} ${gowunDodum.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
