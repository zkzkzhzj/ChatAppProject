import { Gowun_Dodum, IBM_Plex_Sans_KR } from 'next/font/google';

import type { Metadata } from 'next';

import './globals.css';

const gowunDodum = Gowun_Dodum({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const ibmPlexSansKR = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '마음의 고향 — 대화가 그리운 사람을 위한 마을',
  description:
    '누군가의 온기가 필요할 때, 고향에 온 듯한 편안함을 느끼며 대화할 수 있는 마을. 인터랙티브 2D 공간에서 이웃과 자연스럽게 소통하세요.',
  openGraph: {
    title: '마음의 고향',
    description: '대화가 그리운 사람을 위한 장소 기반 의사소통 서비스',
    type: 'website',
  },
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
