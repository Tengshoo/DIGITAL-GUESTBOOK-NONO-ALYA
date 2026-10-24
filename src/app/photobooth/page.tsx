'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, Tv, Heart, Camera } from 'lucide-react';
import PhotoboothStudio from '@/components/Photobooth/PhotoboothStudio';
import { useLanguage, LanguageToggle } from '@/lib/i18n';
import { EVENT_CONFIG } from '@/config/eventConfig';

export default function PhotoboothPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const eventDetails = {
    miniTitle: t.miniTitle,
    welcomeTitle: EVENT_CONFIG.title,
    date: t.date,
    venue: EVENT_CONFIG.venue,
    hashtag: t.hashtag,
  };

  const handleAttachToGuestbook = (stripDataUrl: string) => {
    try {
      sessionStorage.setItem('pending_guestbook_photo', stripDataUrl);
      router.push('/?openModal=true');
    } catch (e) {
      console.warn('Could not store in sessionStorage:', e);
      router.push('/');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#FAF8F5] text-warm-900 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-warm-200/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-warm-700 hover:text-warm-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-champagne-600" />
            <span className="hidden sm:inline">{t.backHome}</span>
            <span className="sm:hidden">{language === 'ms' ? 'Utama' : 'Home'}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm sm:text-base text-champagne-900">
              {eventDetails.welcomeTitle}
            </span>
            <span className="hidden sm:inline-block text-xs text-warm-400">•</span>
            <span className="hidden sm:inline-block text-xs text-warm-500">
              {language === 'ms' ? 'Studio Photobooth' : 'Photobooth Studio'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle lightMode />
            <Link
              href="/wall"
              className="px-3 py-1 rounded-xl bg-champagne-50 hover:bg-champagne-100 border border-champagne-200 text-champagne-800 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Tv className="w-3.5 h-3.5 text-champagne-600" />
              <span className="hidden sm:inline">Live Wall</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 sm:p-8 border border-warm-200 shadow-soft">
          <PhotoboothStudio
            eventInfo={eventDetails}
            onAttachToGuestbook={handleAttachToGuestbook}
          />
        </div>
      </main>
    </div>
  );
}
