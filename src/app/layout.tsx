import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import { EVENT_CONFIG } from '@/config/eventConfig';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#181310',
};

export const metadata: Metadata = {
  title: `${EVENT_CONFIG.title} | ${EVENT_CONFIG.eventType?.en || 'Wedding'} Digital Guestbook & Live Wall`,
  description:
    `Share your photos, videos, or heartfelt memories captured with us today. ${EVENT_CONFIG.hashtag}`,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: EVENT_CONFIG.title,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💍</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=='undefined'&&window.location.protocol==='http:'&&!['localhost','127.0.0.1'].includes(window.location.hostname)){window.location.replace('https://'+window.location.hostname+window.location.pathname+window.location.search+window.location.hash);}`,
          }}
        />
      </head>
      <body className="min-h-screen min-h-[100dvh] text-warm-900 selection:bg-rose-200 selection:text-rose-900 antialiased font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
