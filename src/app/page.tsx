'use client';

import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Send,
  X,
  Heart,
  ArrowRight,
  Tv,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import VoiceRecorder from '@/components/VoiceRecorder';
import PhotoFilterSelector, {
  PHOTO_FILTERS,
  PhotoFilter,
} from '@/components/PhotoFilterSelector';
import PhotoFrameSelector, {
  PHOTO_FRAMES,
  PhotoFrameConfig,
  LivePhotoFrameOverlay,
  applyFilterAndFrameToCanvas,
} from '@/components/PhotoFrameSelector';
import PhotoboothStudio from '@/components/Photobooth/PhotoboothStudio';
import {
  submitGuestbookEntry,
  isPhotoUploadAllowed,
  MAX_PHOTOS_PER_WISH,
} from '@/lib/supabase';
import { uploadPhotosToGoogleDrive } from '@/lib/googleDrive';
import { getAssetPath } from '@/lib/assets';
import { useLanguage, LanguageToggle } from '@/lib/i18n';
import { EVENT_CONFIG } from '@/config/eventConfig';

export default function GuestbookPage() {
  const { language, t } = useLanguage();

  // Event details matching the demo
  const eventDetails = {
    miniTitle: t.miniTitle,
    welcomeTitle: EVENT_CONFIG.title,
    date: t.date,
    venue: t.venue,
    hashtag: t.hashtag,
    welcomeMessage: t.welcomeMessage,
    bgImage: getAssetPath(EVENT_CONFIG.images.background),
    avatarImage: getAssetPath(EVENT_CONFIG.images.avatar),
  };

  // Form states
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [rawPhotos, setRawPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilter['id']>('original');
  const [selectedFrame, setSelectedFrame] = useState<PhotoFrameConfig['id']>('none');
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [submitProgressText, setSubmitProgressText] = useState<string | null>(null);

  const activeRawPhoto = rawPhotos[activePhotoIndex] || rawPhotos[0] || null;

  // Photo upload limit status
  const [photoLimitStatus, setPhotoLimitStatus] = useState<{
    allowed: boolean;
    currentCount: number;
    limit: number;
  }>({
    allowed: true,
    currentCount: 0,
    limit: EVENT_CONFIG.photoUploadLimit || 500,
  });

  // Modal / Drawer toggle
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPhotoboothModalOpen, setIsPhotoboothModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check photo upload limit when modal opens
  useEffect(() => {
    isPhotoUploadAllowed().then(setPhotoLimitStatus).catch(() => {});
  }, [isFormOpen, isPhotoboothModalOpen]);

  // Close modals on Escape key press (Desktop / Hardware keyboard optimization)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPhotoboothModalOpen) setIsPhotoboothModalOpen(false);
        else if (isFormOpen) setIsFormOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, isPhotoboothModalOpen]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Check for pending photobooth strip from /photobooth route or query param
  useEffect(() => {
    try {
      const pendingPhoto = sessionStorage.getItem('pending_guestbook_photo');
      if (pendingPhoto) {
        setRawPhotos([pendingPhoto]);
        setActivePhotoIndex(0);
        setSelectedFilter('original');
        setSelectedFrame('none');
        setIsFormOpen(true);
        sessionStorage.removeItem('pending_guestbook_photo');
      }

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('openModal') === 'true') {
          setIsFormOpen(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handlePhotoboothComplete = (stripDataUrl: string) => {
    if (!photoLimitStatus.allowed) {
      alert(
        language === 'ms'
          ? `Had muat naik foto sebanyak ${photoLimitStatus.limit} keping telah dicapai. Anda tetap boleh memuat turun strip foto ke peranti!`
          : `Photo upload limit of ${photoLimitStatus.limit} has been reached. You can still download your photobooth strip to your device!`
      );
      setIsPhotoboothModalOpen(false);
      return;
    }
    setRawPhotos((prev) => {
      const next = [...prev, stripDataUrl].slice(0, MAX_PHOTOS_PER_WISH);
      setActivePhotoIndex(next.length - 1);
      return next;
    });
    setSelectedFilter('original');
    setSelectedFrame('none');
    setIsPhotoboothModalOpen(false);
    setIsFormOpen(true);
  };

  const compressFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(t.errorInvalidImage));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error(t.errorInvalidImage));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            reject(new Error(t.errorInvalidImage));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Multi-photo upload handling (up to 10 photos) & client-side compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!photoLimitStatus.allowed) {
      setErrorMsg(
        language === 'ms'
          ? `Had muat naik foto sebanyak ${photoLimitStatus.limit} keping telah dicapai. Anda dialu-alukan menghantar ucapan teks & nota suara!`
          : `Photo upload limit of ${photoLimitStatus.limit} has been reached. You can still send text wishes & voice notes!`
      );
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS_PER_WISH - rawPhotos.length;
    if (remainingSlots <= 0) {
      setErrorMsg(
        language === 'ms'
          ? `Maksimum ${MAX_PHOTOS_PER_WISH} keping gambar dibenarkan bagi setiap ucapan.`
          : `You can attach up to ${MAX_PHOTOS_PER_WISH} photos per wish.`
      );
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setErrorMsg(
        language === 'ms'
          ? `Hanya ${MAX_PHOTOS_PER_WISH} keping gambar pertama dipilih (had ${MAX_PHOTOS_PER_WISH} gambar setiap ucapan).`
          : `Only the first ${MAX_PHOTOS_PER_WISH} photos were selected (limit of ${MAX_PHOTOS_PER_WISH} photos per wish).`
      );
    } else {
      setErrorMsg(null);
    }

    const compressedBatch: string[] = [];
    for (const file of filesToProcess) {
      const isImage = file.type
        ? file.type.startsWith('image/')
        : /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
      if (!isImage && file.type) {
        setErrorMsg(t.errorInvalidImage);
        continue;
      }
      try {
        const dataUrl = await compressFileToDataUrl(file);
        compressedBatch.push(dataUrl);
      } catch {
        setErrorMsg(t.errorInvalidImage);
      }
    }

    if (compressedBatch.length > 0) {
      setRawPhotos((prev) => {
        const hadNone = prev.length === 0;
        const next = [...prev, ...compressedBatch].slice(0, MAX_PHOTOS_PER_WISH);
        if (hadNone) {
          setActivePhotoIndex(0);
          setSelectedFilter('original');
          setSelectedFrame('none');
        } else {
          setActivePhotoIndex(next.length - 1);
        }
        return next;
      });
    }
  };

  const removePhotoAt = (indexToRemove: number) => {
    setRawPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length === 0) {
        setSelectedFilter('original');
        setSelectedFrame('none');
        setActivePhotoIndex(0);
      } else if (activePhotoIndex >= next.length) {
        setActivePhotoIndex(next.length - 1);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeAllPhotos = () => {
    setRawPhotos([]);
    setActivePhotoIndex(0);
    setSelectedFilter('original');
    setSelectedFrame('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const triggerConfetti = () => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        colors: ['#D4AF37', '#E5C378', '#FCE7EB', '#DF4F67', '#FFFFFF'],
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch (e) {
      console.warn('Confetti animation failed:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg(t.errorNameRequired);
      return;
    }

    if (!message.trim()) {
      setErrorMsg(t.errorMessageRequired);
      return;
    }

    setIsSubmitting(true);
    setSubmitProgressText(null);

    try {
      const finalPhotoUrls: string[] = [];
      if (rawPhotos.length > 0) {
        for (let i = 0; i < rawPhotos.length; i++) {
          if (rawPhotos.length > 1) {
            setSubmitProgressText(
              language === 'ms'
                ? `Memproses gambar ${i + 1}/${rawPhotos.length}...`
                : `Processing photo ${i + 1}/${rawPhotos.length}...`
            );
          }
          const framedUrl = await applyFilterAndFrameToCanvas(
            rawPhotos[i],
            selectedFilter,
            selectedFrame
          );
          finalPhotoUrls.push(framedUrl);
        }

        // Upload all photos / photobooth strips sequentially to Google Drive folder in the background
        uploadPhotosToGoogleDrive({
          photosBase64: finalPhotoUrls,
          guestName: name.trim(),
          message: message.trim(),
        }).catch((err) => console.warn('Google Drive background upload:', err));
      }

      setSubmitProgressText(t.submittingBtn);

      const result = await submitGuestbookEntry({
        name: name.trim(),
        message: message.trim(),
        photo_urls: finalPhotoUrls,
        audio_url: voiceBase64,
      });

      if (!result.success) {
        throw new Error(result.error || t.errorGenericSubmit);
      }

      setIsSuccess(true);
      triggerConfetti();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t.errorGenericSubmit;
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
      setSubmitProgressText(null);
    }
  };

  const resetForm = () => {
    setMessage('');
    setRawPhotos([]);
    setActivePhotoIndex(0);
    setSelectedFilter('original');
    setSelectedFrame('none');
    setVoiceBase64(null);
    setErrorMsg(null);
    setIsSuccess(false);
    setIsFormOpen(false);
  };

  const openFormWithName = () => {
    setIsFormOpen(true);
  };

  const currentFilterConfig =
    PHOTO_FILTERS.find((f) => f.id === selectedFilter) || PHOTO_FILTERS[0];

  const currentFrameConfig =
    PHOTO_FRAMES.find((f) => f.id === selectedFrame) || PHOTO_FRAMES[0];

  return (
    <div className="relative w-full min-h-screen min-h-[100lvh] flex flex-col justify-between overflow-x-clip text-white select-none bg-[#120F0D]">
      {/* 1. Full-Bleed Cinematic Background - 100% Static During Mobile Scroll */}
      <div
        className="fixed -top-[6vh] left-0 w-full h-[112lvh] min-h-[112lvh] pointer-events-none overflow-hidden z-0 gpu-layer"
        style={{
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eventDetails.bgImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center select-none pointer-events-none"
          loading="eager"
          decoding="async"
        />
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/80" />
      </div>

      {/* 2. Top Event Navigation Bar */}
      <header className="relative z-10 w-full max-w-lg mx-auto safe-pt px-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/40 sm:bg-white/15 backdrop-blur-xs sm:backdrop-blur-md border border-white/20 text-champagne-200 text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
          <span>{eventDetails.hashtag}</span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link
            href="/wall"
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xs sm:backdrop-blur-md border border-white/20 text-xs text-warm-200 transition-colors shadow-xs active:scale-95"
          >
            <Tv className="w-3.5 h-3.5 text-champagne-400" />
            <span>{t.liveWall}</span>
          </Link>
        </div>
      </header>

      {/* 3. Main Centered Cover Content */}
      <main className="relative z-10 w-full max-w-md mx-auto px-5 py-8 my-auto flex flex-col items-center text-center animate-fade-in gpu-layer">
        {/* Couple Circular Avatar */}
        <div className="relative mb-5 group">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/90 shadow-[0_15px_35px_rgba(0,0,0,0.5)] ring-4 ring-champagne-400/40 transition-transform duration-300 group-hover:scale-105 bg-warm-200 gpu-layer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={eventDetails.avatarImage}
              alt={eventDetails.welcomeTitle}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="absolute -bottom-2 -right-1 w-8 h-8 rounded-full bg-champagne-500 text-white flex items-center justify-center shadow-md border-2 border-white">
            <Heart className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Mini Title */}
        <span className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-champagne-300 mb-2 drop-shadow-sm font-sans">
          {eventDetails.miniTitle}
        </span>

        {/* Main Couple Title */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          {eventDetails.welcomeTitle}
        </h1>

        {/* Event Metadata (Date & Venue) */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-full bg-black/40 sm:bg-white/10 backdrop-blur-xs sm:backdrop-blur-md border border-white/20 text-xs sm:text-sm text-warm-100 shadow-sm mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-champagne-300" />
            <span>{eventDetails.date}</span>
          </span>
          <span className="text-white/40">•</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-300" />
            <span>{eventDetails.venue}</span>
          </span>
        </div>

        {/* Welcoming Message */}
        <p className="font-serif italic text-base sm:text-lg text-warm-200/95 leading-relaxed max-w-sm mb-8 drop-shadow">
          &ldquo;{eventDetails.welcomeMessage}&rdquo;
        </p>

        {/* 4. Guest Entry Box */}
        <div className="w-full bg-black/60 sm:bg-black/40 backdrop-blur-sm sm:backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/20 shadow-2xl flex flex-col gap-3.5 gpu-layer">
          <div className="flex flex-col gap-1.5 text-left">
            <label
              htmlFor="guest-name-cover"
              className="text-xs uppercase font-semibold tracking-wider text-champagne-300"
            >
              {t.yourName}
            </label>
            <input
              id="guest-name-cover"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.enterNamePlaceholder}
              className="w-full px-4 py-3.5 rounded-2xl border border-white/25 bg-white/10 text-white placeholder-white/50 text-center text-[16px] sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-champagne-400 focus:bg-black/40 transition-colors"
            />
          </div>

          {/* Primary Action Button: Share Wishes */}
          <button
            type="button"
            onClick={openFormWithName}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-champagne-500 via-champagne-400 to-champagne-500 hover:from-champagne-600 hover:to-champagne-500 text-warm-950 font-bold text-sm tracking-wide shadow-champagne transition-transform duration-150 active:scale-[0.98] flex items-center justify-center gap-2 gpu-layer"
          >
            <Camera className="w-4 h-4 fill-warm-950" />
            <span>{t.shareMomentBtn}</span>
          </button>

          {/* Photobooth Studio Action */}
          <Link
            href="/photobooth"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-champagne-800/80 via-warm-900/90 to-amber-900/80 hover:from-champagne-800 hover:to-amber-900 border border-champagne-400/40 text-white font-bold text-xs tracking-wide shadow-lg transition-transform duration-150 active:scale-[0.98] flex items-center justify-center gap-2 group backdrop-blur-xs sm:backdrop-blur-sm gpu-layer"
          >
            <Sparkles className="w-4 h-4 text-champagne-300 group-hover:rotate-12 transition-transform duration-200" />
            <span>{t.photoboothBtn}</span>
          </Link>

          {/* Secondary Action: Live Wall */}
          <Link
            href="/wall"
            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Tv className="w-3.5 h-3.5 text-champagne-300" />
            <span>{t.liveWallBtn}</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 safe-pb text-[11px] text-white/50 backdrop-blur-xs sm:backdrop-blur-sm">
        <p>{t.footerCelebration.replace('{title}', eventDetails.welcomeTitle)}</p>
      </footer>

      {/* 5. Interactive Submission Modal / Sheet */}
      {isFormOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFormOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 sm:bg-black/60 backdrop-blur-xs sm:backdrop-blur-sm animate-fade-in gpu-layer cursor-pointer sm:cursor-default"
        >
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain touch-scroll bg-[#FAF8F5] text-warm-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl border-t sm:border border-champagne-300 relative animate-fade-up gpu-layer cursor-default">
            {/* Mobile bottom-sheet drag handle */}
            <div className="w-12 h-1.5 bg-warm-300 rounded-full mx-auto -mt-1 mb-3.5 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-warm-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-champagne-100 flex items-center justify-center text-champagne-700">
                  <Heart className="w-4 h-4 fill-rose-500/20 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-warm-900">
                    {t.modalTitle}
                  </h3>
                  <p className="text-[11px] text-warm-500">
                    {t.forCouple.replace('{title}', eventDetails.welcomeTitle)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <LanguageToggle lightMode />
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-full hover:bg-warm-200 text-warm-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Success Celebration View */}
            {isSuccess ? (
              <div className="py-8 text-center animate-fade-up">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-champagne-100 border-2 border-champagne-300 flex items-center justify-center text-champagne-700 shadow-champagne">
                  <Sparkles className="w-8 h-8 animate-pulse text-champagne-600" />
                </div>

                <h2 className="font-serif text-3xl font-bold text-warm-900 mb-2">
                  {t.thankYouTitle.replace('{name}', name)}
                </h2>
                <p className="font-serif italic text-base text-champagne-800 mb-2">
                  {t.thankYouSubtitle}
                </p>
                <p className="text-xs text-warm-600 max-w-sm mx-auto mb-6">
                  {t.thankYouLiveWallNote}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-warm-100 text-warm-800 border border-warm-300 font-medium text-xs transition"
                  >
                    {t.sendAnotherBtn}
                  </button>
                  <Link
                    href="/wall"
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-champagne-600 hover:bg-champagne-700 text-white font-medium text-xs transition shadow-champagne"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>{t.watchLiveWallBtn}</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Submission Form */
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-rose-200 flex-shrink-0 flex items-center justify-center text-rose-700 text-[10px] font-bold">
                      !
                    </div>
                    <p>{errorMsg}</p>
                  </div>
                )}

                {/* Field 1: Guest Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="guest-name-modal"
                    className="text-xs font-semibold uppercase tracking-wider text-warm-700"
                  >
                    {t.yourName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="guest-name-modal"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'ms' ? 'Contoh: Sarah & Michael' : 'e.g. Sarah & Michael'}
                    maxLength={100}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-white text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-champagne-400 text-[16px] sm:text-sm"
                  />
                </div>

                {/* Field 2: Well Wishes / Message */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="guest-message-modal"
                    className="text-xs font-semibold uppercase tracking-wider text-warm-700"
                  >
                    {t.wishesLabel} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="guest-message-modal"
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.wishesPlaceholder}
                    maxLength={2000}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-white text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-champagne-400 text-[16px] sm:text-sm resize-none"
                  />
                  <span className="text-[10px] text-right text-warm-400">
                    {message.length} / 2000 {t.charsCount}
                  </span>
                </div>

                {/* Field 3: Photo Upload (Up to 10 Photos) with 4 Filters & Optional Cute Frames */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-warm-700">
                      {t.photoLabel}
                    </span>
                    {rawPhotos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-champagne-800 bg-champagne-100 px-2 py-0.5 rounded-full">
                          {rawPhotos.length} / {MAX_PHOTOS_PER_WISH}
                        </span>
                        {rawPhotos.length > 1 && (
                          <button
                            type="button"
                            onClick={removeAllPhotos}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-medium underline"
                          >
                            {language === 'ms' ? 'Padam Semua' : 'Clear All'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hidden file inputs always mounted so "+ Add" works anytime */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {activeRawPhoto ? (
                    <div className="flex flex-col gap-3">
                      {/* Main Active Photo Preview */}
                      <div className="relative group">
                        <LivePhotoFrameOverlay frameId={selectedFrame}>
                          <div className="relative overflow-hidden bg-warm-100 rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeRawPhoto}
                              alt={`Guest memory preview ${activePhotoIndex + 1}`}
                              className="w-full max-h-64 object-cover object-center transition-all duration-300"
                              style={{ filter: currentFilterConfig.cssFilter }}
                            />

                            {/* Prev / Next Navigation Arrows when multiple photos are attached */}
                            {rawPhotos.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActivePhotoIndex(
                                      (prev) => (prev - 1 + rawPhotos.length) % rawPhotos.length
                                    )
                                  }
                                  aria-label="Previous photo"
                                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition shadow-md z-20"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActivePhotoIndex((prev) => (prev + 1) % rawPhotos.length)
                                  }
                                  aria-label="Next photo"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition shadow-md z-20"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => removePhotoAt(activePhotoIndex)}
                              aria-label={t.removePhoto}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white transition shadow-md z-20"
                            >
                              <X className="w-4 h-4" />
                            </button>

                            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1.5 border border-white/20 shadow-sm z-20">
                              <Sparkles className="w-3 h-3 text-champagne-300" />
                              <span>
                                {rawPhotos.length > 1 && `${activePhotoIndex + 1}/${rawPhotos.length} • `}
                                {currentFilterConfig.name}
                                {selectedFrame !== 'none' &&
                                  ` • ${currentFrameConfig.shortLabel}`}
                              </span>
                            </div>
                          </div>
                        </LivePhotoFrameOverlay>
                      </div>

                      {/* Horizontal Thumbnail Strip + Add More Photos Button */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                        {rawPhotos.map((thumb, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${
                              idx === activePhotoIndex
                                ? 'border-champagne-500 ring-2 ring-champagne-300 scale-105'
                                : 'border-warm-200 opacity-75 hover:opacity-100'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                              style={{ filter: currentFilterConfig.cssFilter }}
                            />
                            <span className="absolute bottom-0.5 left-1 text-[9px] font-mono font-bold text-white bg-black/60 px-1 rounded">
                              {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePhotoAt(idx);
                              }}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center"
                              aria-label={`Remove photo ${idx + 1}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        {rawPhotos.length < MAX_PHOTOS_PER_WISH && (
                          <>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-14 h-14 rounded-xl border-2 border-dashed border-champagne-400 bg-champagne-50/60 hover:bg-champagne-100/80 text-champagne-800 flex flex-col items-center justify-center flex-shrink-0 transition"
                              title={language === 'ms' ? 'Tambah gambar dari galeri' : 'Add more photos'}
                            >
                              <Plus className="w-4 h-4 text-champagne-700" />
                              <span className="text-[9px] font-bold">
                                {language === 'ms' ? 'Tambah' : 'Add'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              className="w-14 h-14 rounded-xl border border-warm-200 bg-white hover:bg-warm-100 text-warm-700 flex flex-col items-center justify-center flex-shrink-0 transition"
                              title={language === 'ms' ? 'Ambil selfie lagi' : 'Take another selfie'}
                            >
                              <Camera className="w-4 h-4 text-champagne-600" />
                              <span className="text-[9px] font-medium">Selfie</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* 4 Sets of Photo Filters */}
                      <PhotoFilterSelector
                        photoUrl={activeRawPhoto}
                        selectedFilter={selectedFilter}
                        onSelectFilter={(fid) => setSelectedFilter(fid)}
                      />

                      {/* Aesthetic & Cute Frames Picker */}
                      <PhotoFrameSelector
                        selectedFrame={selectedFrame}
                        onSelectFrame={(fId) => setSelectedFrame(fId)}
                      />
                    </div>
                  ) : !photoLimitStatus.allowed ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-950">
                          {language === 'ms'
                            ? `Had Muat Naik Foto Telah Dicapai (${photoLimitStatus.currentCount}/${photoLimitStatus.limit})`
                            : `Photo Upload Limit Reached (${photoLimitStatus.currentCount}/${photoLimitStatus.limit})`}
                        </p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
                          {language === 'ms'
                            ? 'Muat naik foto kini ditutup untuk acara ini. Anda tetap dialu-alukan menghantar ucapan teks & nota suara!'
                            : 'Photo uploads are now closed for this event. You are still warmly invited to send text wishes & voice notes!'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsPhotoboothModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-champagne-300 bg-gradient-to-r from-amber-50 via-champagne-50 to-rose-50 hover:from-amber-100 hover:to-rose-100 text-champagne-950 font-bold text-xs shadow-xs transition active:scale-[0.98] group"
                      >
                        <Sparkles className="w-4 h-4 text-champagne-700 group-hover:rotate-12 transition-transform" />
                        <span>{t.photoboothModalBtn}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-warm-200 bg-white hover:bg-champagne-50 hover:border-champagne-300 transition text-warm-800 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-champagne-100 group-hover:bg-champagne-200 flex items-center justify-center text-champagne-700 transition">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium">{t.selfieBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-warm-200 bg-white hover:bg-warm-100 hover:border-warm-300 transition text-warm-800 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-warm-700 transition">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium">{t.choosePhotoBtn}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Field 4: Voice Note Recorder */}
                <div className="pt-1">
                  <VoiceRecorder onChange={(audio) => setVoiceBase64(audio)} />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-champagne-600 via-champagne-500 to-champagne-600 hover:from-champagne-700 hover:to-champagne-600 text-white font-medium text-sm tracking-wide shadow-champagne transition-transform duration-150 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2 gpu-layer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{submitProgressText || t.submittingBtn}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 fill-current" />
                      <span>{t.submitBtn}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. In-Page Photobooth Studio Modal */}
      {isPhotoboothModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPhotoboothModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs sm:backdrop-blur-sm animate-fade-in cursor-pointer sm:cursor-default"
        >
          <div className="w-full max-w-4xl max-h-[94dvh] overflow-y-auto overscroll-contain touch-scroll bg-[#FAF8F5] rounded-3xl p-4 sm:p-7 shadow-2xl border border-champagne-300 relative cursor-default">
            <PhotoboothStudio
              eventInfo={{
                ...eventDetails,
                welcomeTitle: EVENT_CONFIG.photobooth?.coupleNames || eventDetails.welcomeTitle,
                date: EVENT_CONFIG.photobooth?.date || eventDetails.date,
                miniTitle: EVENT_CONFIG.photobooth?.tagline || eventDetails.miniTitle,
              }}
              onClose={() => setIsPhotoboothModalOpen(false)}
              onAttachToGuestbook={handlePhotoboothComplete}
              isModal
            />
          </div>
        </div>
      )}
    </div>
  );
}
