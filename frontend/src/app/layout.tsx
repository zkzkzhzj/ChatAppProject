import { Gowun_Dodum, IBM_Plex_Sans_KR } from 'next/font/google';

import type { Metadata } from 'next';

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
