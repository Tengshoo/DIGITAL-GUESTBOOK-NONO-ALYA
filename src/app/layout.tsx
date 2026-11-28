import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import { EVENT_CONFIG } from '@/config/eventConfig';
import { getAssetPath } from '@/lib/assets';

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
  description: `Share your photos, videos, or heartfelt memories captured with us today. ${EVENT_CONFIG.hashtag}`,
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

const PRIMARY_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600;700&display=swap';

const DECORATIVE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Courier+Prime:wght@400;700&family=Dancing+Script:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&display=swap';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const heroBg = getAssetPath(EVENT_CONFIG.images.background);
  const heroAvatar = getAssetPath(EVENT_CONFIG.images.avatar);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRIMARY_FONTS_URL} />
        {/* Non-blocking preload for secondary photobooth/selfie decorative fonts */}
        <link rel="preload" as="style" href={DECORATIVE_FONTS_URL} />
        <link rel="stylesheet" href={DECORATIVE_FONTS_URL} />
        {heroBg && <link rel="preload" as="image" href={heroBg} fetchPriority="high" />}
        {heroAvatar && <link rel="preload" as="image" href={heroAvatar} />}
      </head>
      <body className="min-h-screen min-h-[100dvh] text-warm-900 selection:bg-rose-200 selection:text-rose-900 antialiased font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
