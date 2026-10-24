'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Sparkles,
  Heart,
  Grid,
  Monitor,
  Volume2,
  Camera,
} from 'lucide-react';
import Link from 'next/link';
import AudioPlayer from '@/components/AudioPlayer';
import { getApprovedEntries, getSupabase } from '@/lib/supabase';
import { EVENT_CONFIG } from '@/config/eventConfig';
import { getAssetPath } from '@/lib/assets';

interface GuestEntry {
  id: number;
  name: string;
  message: string;
  photo_url?: string | null;
  signature_svg?: string | null;
  audio_url?: string | null;
  is_approved: number;
  created_at: string;
}

export default function WallModePage() {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [qrOrigin, setQrOrigin] = useState('');

  const CYCLE_INTERVAL = 7000; // 7 seconds per slide
  const POLL_INTERVAL = 5000; // 5 seconds polling
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Setup QR origin URL once on client with basePath support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      setQrOrigin(`${window.location.origin}${basePath}`);
    }
  }, []);

  // Fetch approved entries from Supabase / Local data
  const fetchEntries = useCallback(async () => {
    try {
      const data = await getApprovedEntries();
      if (Array.isArray(data)) {
        setEntries((prev) => {
          // If counts changed or IDs differ, update
          if (JSON.stringify(data) !== JSON.stringify(prev)) {
            return data;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error polling live entries:', err);
    }
  }, []);

  // Realtime subscription if Supabase is active
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('entries_realtime_wall')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  // Initial load and polling fallback every 5 seconds
  useEffect(() => {
    fetchEntries();
    const pollId = setInterval(fetchEntries, POLL_INTERVAL);
    return () => clearInterval(pollId);
  }, [fetchEntries]);

  // Handle slide progression
  const goToNext = useCallback(() => {
    if (entries.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % entries.length);
    setProgress(0);
  }, [entries.length]);

  const goToPrev = useCallback(() => {
    if (entries.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + entries.length) % entries.length);
    setProgress(0);
  }, [entries.length]);

  // Auto-cycle timer (7 seconds)
  useEffect(() => {
    if (isPaused || entries.length <= 1 || isGridView) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const intervalStep = 100;
    const increment = (intervalStep / CYCLE_INTERVAL) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + increment;
      });
    }, intervalStep);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPaused, entries.length, isGridView, goToNext]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const el = document.documentElement as unknown as {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
    };

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
      };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const activeEntry = entries[currentIndex];

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const bgImage = getAssetPath(EVENT_CONFIG.images.background);

  return (
    <div
      className={`relative w-full min-h-screen min-h-[100dvh] flex flex-col justify-between overflow-x-hidden bg-[#140f0c] text-[#FAF8F5] select-none transition-all pb-[env(safe-area-inset-bottom,0px)] ${
        isFullscreen ? 'fixed inset-0 z-50 p-3 sm:p-8' : 'p-3 sm:p-8'
      }`}
    >
      {/* 1. Full-Bleed Cinematic Background Image Matching Main Page */}
      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center select-none pointer-events-none scale-105"
          loading="eager"
          decoding="async"
        />
        {/* Dark Vignette Overlay for Crisp Readability on Projectors & Screens */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/85" />
      </div>

      {/* 2. Background Animated Bokeh Sparks */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full bg-champagne-400/20 blur-3xl animate-float-gentle" />
        <div className="absolute bottom-1/3 right-1/6 w-72 h-72 rounded-full bg-rose-500/15 blur-3xl animate-float-gentle" style={{ animationDelay: '3s' }} />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between gap-4 max-w-7xl mx-auto w-full pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="Back to Home"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-warm-900/80 hover:bg-champagne-600/90 border border-warm-700/80 hover:border-champagne-400 text-warm-200 hover:text-white text-xs font-medium transition shadow-md group"
          >
            <ArrowLeft className="w-4 h-4 text-champagne-300 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <div className="w-10 h-10 rounded-full bg-champagne-500/20 border border-champagne-400/40 flex items-center justify-center text-champagne-300 shadow-champagne">
            <Heart className="w-5 h-5 fill-rose-500/40 text-rose-300" />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-champagne-100 flex items-center gap-2">
              <span>Celebration Moments</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h1>
            <p className="text-xs text-warm-300/80 font-sans tracking-wider uppercase">
              Live Event Guestbook • {entries.length} Memories Shared
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 bg-warm-900/60 backdrop-blur-md p-1.5 rounded-full border border-warm-700/60 shadow-lg">
          {/* Toggle Grid vs Single Spotlight view */}
          <button
            onClick={() => setIsGridView(!isGridView)}
            title={isGridView ? 'Switch to Spotlight Slideshow' : 'Switch to Gallery Grid'}
            className={`p-2 rounded-full transition ${
              isGridView ? 'bg-champagne-500 text-warm-950 font-bold' : 'text-warm-300 hover:text-white'
            }`}
          >
            {isGridView ? <Monitor className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          {/* QR Code Modal Launcher */}
          <button
            onClick={() => setShowQrModal(true)}
            title="Show QR Code for Guests"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-champagne-200 bg-champagne-500/20 hover:bg-champagne-500/30 border border-champagne-500/40 transition"
          >
            <QrCode className="w-4 h-4 text-champagne-300" />
            <span className="hidden sm:inline">Guest QR</span>
          </button>

          {/* Photobooth Studio Link */}
          <Link
            href="/photobooth"
            title="Photobooth Studio"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-warm-200 bg-white/10 hover:bg-white/20 border border-white/20 transition"
          >
            <Camera className="w-4 h-4 text-champagne-300" />
            <span className="hidden sm:inline">Photobooth</span>
          </Link>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 text-warm-300 hover:text-white rounded-full transition"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Presentation Screen */}
      <main className="relative z-10 flex-1 flex items-center justify-center max-w-6xl mx-auto w-full my-auto py-2">
        {entries.length === 0 ? (
          /* Empty State */
          <div className="text-center p-10 bg-warm-900/50 backdrop-blur-md rounded-3xl border border-warm-800 max-w-lg shadow-2xl">
            <Sparkles className="w-12 h-12 text-champagne-400 mx-auto mb-4 animate-bounce" />
            <h2 className="font-serif text-3xl font-bold text-champagne-200 mb-2">
              Waiting for the First Wish
            </h2>
            <p className="text-warm-300 text-sm mb-6">
              Scan the QR code with your smartphone camera to be the very first guest on the big screen!
            </p>
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-champagne-500 hover:bg-champagne-600 text-warm-950 font-medium text-sm transition shadow-champagne"
            >
              <QrCode className="w-4 h-4" />
              <span>Display Guest QR Code</span>
            </button>
          </div>
        ) : isGridView ? (
          /* Event Gallery Grid Mode (2xN on mobile, 3xN on tablet, 4xN on desktop) */
          <div className="w-full max-h-[78vh] overflow-y-auto pr-1 sm:pr-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-fade-in">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white text-warm-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-polaroid border border-champagne-200/50 flex flex-col justify-between transition-transform hover:scale-[1.02]"
              >
                <div>
                  {entry.photo_url && (
                    <div className="mb-2.5 sm:mb-4 rounded-lg sm:rounded-xl overflow-hidden bg-warm-100/70 border border-warm-200/80 max-h-44 sm:max-h-72 w-full flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.photo_url}
                        alt={`Photo from ${entry.name}`}
                        className="max-h-44 sm:max-h-72 w-auto max-w-full object-contain rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <p className="font-serif italic text-xs sm:text-base text-warm-800 line-clamp-3 sm:line-clamp-4 mb-2 sm:mb-3 leading-snug">
                    &ldquo;{entry.message}&rdquo;
                  </p>
                </div>

                <div className="pt-2 sm:pt-3 border-t border-warm-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif font-bold text-champagne-900 text-xs sm:text-sm truncate">
                      {entry.name}
                    </h4>
                    <span className="text-[9px] sm:text-[10px] text-warm-500 block truncate">
                      {formatTimestamp(entry.created_at)}
                    </span>
                  </div>
                </div>

                {entry.audio_url && (
                  <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2">
                    <AudioPlayer src={entry.audio_url} compact />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Cinematic Spotlight Polaroid Mode */
          <div
            key={activeEntry.id}
            className="w-full max-w-4xl transition-all duration-700 ease-out animate-fade-up"
          >
            <div className="bg-gradient-to-b from-[#FFFDF9] to-[#FAF5EE] text-warm-900 rounded-3xl p-6 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-4 border-[#F5EEDB] relative">
              {/* Corner Golden Pin / Ribbon Accent */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-champagne-600 text-white text-[11px] font-sans font-semibold tracking-widest uppercase shadow-md flex items-center gap-1.5 border border-champagne-300">
                <Sparkles className="w-3 h-3 text-champagne-200" />
                <span>Memory #{activeEntry.id}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
                {/* Left: Photo column (if available) */}
                {activeEntry.photo_url ? (
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="relative p-3 bg-white rounded-2xl shadow-polaroid border border-warm-200 rotate-[-1.5deg] hover:rotate-0 transition-transform duration-500 max-w-sm w-full">
                      <div className="max-h-[360px] sm:max-h-[440px] flex items-center justify-center rounded-xl overflow-hidden bg-warm-100/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeEntry.photo_url}
                          alt={`Memory captured by ${activeEntry.name}`}
                          className="max-h-[360px] sm:max-h-[440px] w-auto max-w-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="pt-2 text-center">
                        <span className="font-serif italic text-xs text-warm-500">
                          Captured at the celebration
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-4 hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-champagne-50/70 border border-champagne-200/60 text-center">
                    <div className="w-16 h-16 rounded-full bg-champagne-100 border-2 border-champagne-300 flex items-center justify-center text-champagne-700 mb-3 shadow-champagne">
                      <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20" />
                    </div>
                    <span className="font-serif text-lg font-semibold text-warm-800">
                      Celebration Toast
                    </span>
                    <span className="text-xs text-warm-500 mt-1">
                      Forever cherished
                    </span>
                  </div>
                )}

                {/* Right: Message & Signature column */}
                <div
                  className={`${
                    activeEntry.photo_url ? 'lg:col-span-7' : 'lg:col-span-8'
                  } flex flex-col justify-between gap-6`}
                >
                  {/* Message Quote */}
                  <div className="space-y-4">
                    <span className="font-serif text-4xl sm:text-5xl leading-none text-champagne-400 font-bold block">
                      &ldquo;
                    </span>
                    <blockquote className="font-serif italic text-2xl sm:text-3xl text-warm-900 leading-relaxed max-h-[36vh] overflow-y-auto pr-2">
                      {activeEntry.message}
                    </blockquote>
                  </div>

                  {/* Audio note if present */}
                  {activeEntry.audio_url && (
                    <div className="pt-1">
                      <AudioPlayer src={activeEntry.audio_url} label={`Voice wish from ${activeEntry.name}`} />
                    </div>
                  )}

                  {/* Sign-off */}
                  <div className="pt-4 border-t-2 border-warm-200/70 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-warm-500 block">
                        Warm wishes from
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-champagne-800 tracking-tight">
                        {activeEntry.name}
                      </h3>
                      <span className="text-xs text-warm-400">
                        {formatTimestamp(activeEntry.created_at)}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-champagne-100/80 border border-champagne-300 flex items-center justify-center text-champagne-700 shadow-sm">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Cycling & Controller Bar */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full pt-4">
        {/* Auto-cycle progress bar */}
        {!isGridView && entries.length > 1 && (
          <div className="w-full bg-warm-900/80 h-1.5 rounded-full overflow-hidden mb-3 border border-warm-800">
            <div
              className="bg-gradient-to-r from-champagne-500 to-rose-400 h-full transition-all duration-100 ease-linear shadow-champagne"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-warm-400">
          {/* Navigation Controls */}
          {!isGridView && entries.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                aria-label="Previous note"
                className="p-2 rounded-full bg-warm-900/80 hover:bg-warm-800 text-warm-200 border border-warm-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-900/80 hover:bg-warm-800 text-champagne-300 border border-warm-700 transition font-medium"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                <span>{isPaused ? 'Paused' : 'Auto-playing'}</span>
              </button>

              <button
                onClick={goToNext}
                aria-label="Next note"
                className="p-2 rounded-full bg-warm-900/80 hover:bg-warm-800 text-warm-200 border border-warm-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="ml-2 font-mono text-warm-400">
                {currentIndex + 1} of {entries.length}
              </span>
            </div>
          )}

          {/* Quick link to sign */}
          <div className="ml-auto flex items-center gap-4 text-xs">
            <Link
              href="/"
              className="text-warm-400 hover:text-champagne-300 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Laman Utama</span>
            </Link>
            <button
              onClick={() => setShowQrModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-champagne-300 hover:text-champagne-100 underline decoration-champagne-500/50 underline-offset-4"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Kongsikan Memori Anda</span>
            </button>
            <Link
              href="/admin"
              className="text-warm-500 hover:text-warm-300 transition"
            >
              Admin Moderation
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating QR Code Modal for Event Guests */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#FAF8F5] text-warm-900 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border-2 border-champagne-300 relative animate-fade-up">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-warm-500 hover:text-warm-900 hover:bg-warm-200 transition"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-full bg-champagne-100 mx-auto mb-3 flex items-center justify-center text-champagne-700">
              <QrCode className="w-7 h-7" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-warm-900 mb-1">
              Kongsikan Memori Anda!
            </h3>
            <p className="text-xs text-warm-600 mb-5">
              Imbas kod QR menggunakan kamera telefon untuk membuka buku tetamu digital.
            </p>

            {/* QR Code generator via standard public api or canvas */}
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-warm-200 inline-block mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  qrOrigin || 'http://localhost:3000'
                )}&color=3F3229`}
                alt="QR code to sign the guestbook"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <p className="font-mono text-[11px] text-warm-500 break-all bg-warm-100/80 p-2 rounded-lg">
              {qrOrigin || 'http://localhost:3000'}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full py-2.5 rounded-full bg-champagne-600 hover:bg-champagne-700 text-white font-medium text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
