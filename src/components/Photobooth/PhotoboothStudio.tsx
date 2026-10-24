'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Download,
  Send,
  SwitchCamera,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Heart,
  Wand2,
  Play,
  X,
  Smartphone,
} from 'lucide-react';
import { PHOTOBOOTH_STRIP_THEMES, PhotoboothStripTheme } from './stripThemes';
import PhotoboothStripView from './PhotoboothStripView';
import { generatePhotoboothStripCanvas, downloadStripImage, EventInfo } from '@/lib/photoboothCanvas';
import { uploadPhotoToGoogleDrive } from '@/lib/googleDrive';
import { PHOTO_FILTERS, PhotoFilter } from '@/components/PhotoFilterSelector';
import { useLanguage } from '@/lib/i18n';
import { EVENT_CONFIG } from '@/config/eventConfig';
import { isPhotoUploadAllowed } from '@/lib/supabase';

interface PhotoboothStudioProps {
  onAttachToGuestbook?: (stripDataUrl: string) => void;
  onClose?: () => void;
  eventInfo?: EventInfo;
  isModal?: boolean;
}

export default function PhotoboothStudio({
  onAttachToGuestbook,
  onClose,
  eventInfo = {
    welcomeTitle: EVENT_CONFIG.title,
    miniTitle: EVENT_CONFIG.eventType.ms,
    date: EVENT_CONFIG.date.en,
    venue: EVENT_CONFIG.venue,
    hashtag: EVENT_CONFIG.hashtag,
  },
  isModal = false,
}: PhotoboothStudioProps) {
  const { language, t } = useLanguage();

  // State
  const [photos, setPhotos] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [selectedTheme, setSelectedTheme] = useState<PhotoboothStripTheme['id']>('floral-clip');
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilter['id']>('original');
  const [slotCount, setSlotCount] = useState<number>(3); // 3-cut or 4-cut matching template
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [savedStripModal, setSavedStripModal] = useState<{
    dataUrl: string;
    blobUrl?: string;
    filename: string;
  } | null>(null);

  // Handle theme selection and automatically adapt slot count
  const handleSelectTheme = (themeId: PhotoboothStripTheme['id']) => {
    setSelectedTheme(themeId);
    const theme = PHOTOBOOTH_STRIP_THEMES.find((t) => t.id === themeId);
    if (theme) {
      setSlotCount(theme.slotCount);
      if (activeSlot >= theme.slotCount) {
        setActiveSlot(theme.slotCount - 1);
      }
    }
  };

  // Camera stream & recording
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Countdown & auto-booth flow
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAutoShooting, setIsAutoShooting] = useState(false);
  const [autoShootStep, setAutoShootStep] = useState<number>(0);
  const [autoShootMessage, setAutoShootMessage] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Hidden file input for uploading from device
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  // Web Audio shutter click
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay blocked or unsupported - silent fallback
    }
  }, []);

  // Initialize Camera with robust mobile WebKit/Safari support
  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    setIsCameraReady(false);

    try {
      // 1. Clean up any existing stream tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera tidak disokong pada pelayar atau peranti ini.');
      }

      // 2. Request user media with ideal constraints, with progressive fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 960, min: 480 },
          },
          audio: false,
        });
      } catch (errConstraint) {
        console.warn('Initial camera constraints failed, attempting basic fallback:', errConstraint);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
            },
            audio: false,
          });
        } catch {
          // Final fallback: any available video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;

      // 3. Attach immediately to video element
      const video = videoRef.current;
      if (video) {
        // Essential attributes for iOS Safari WebKit inline playback
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.srcObject = stream;

        // Listen for metadata load & playback start
        const handleLoaded = async () => {
          try {
            await video.play();
            setIsCameraReady(true);
            setIsCameraActive(true);
            setIsCameraLoading(false);
          } catch (e) {
            console.warn('video.play() failed on metadata load:', e);
            setIsCameraActive(true);
            setIsCameraLoading(false);
          }
        };

        if (video.readyState >= 2) {
          handleLoaded();
        } else {
          video.onloadedmetadata = handleLoaded;
        }

        video.play().then(() => {
          setIsCameraReady(true);
          setIsCameraActive(true);
          setIsCameraLoading(false);
        }).catch(() => {
          // Will be handled by onLoadedMetadata or user gesture
        });
      } else {
        setIsCameraActive(true);
        setIsCameraLoading(false);
      }
    } catch (err: unknown) {
      console.warn('Camera permission or init failed:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Sila benarkan akses kamera untuk menggunakan photobooth.';
      setCameraError(msg);
      setIsCameraActive(false);
      setIsCameraReady(false);
      setIsCameraLoading(false);
    }
  }, [facingMode]);

  // Cleanup Camera on unmount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Double-safety guard: ensure videoRef always gets attached if stream exists
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().then(() => {
        setIsCameraReady(true);
        setIsCameraLoading(false);
      }).catch(() => {});
    }
  });

  // Handle visibility change (e.g. mobile user switches apps or returns to Safari)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && videoRef.current && streamRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Toggle front/back camera with smooth transition feedback
  const toggleCamera = () => {
    if (isFlipping || isCameraLoading) return;
    setIsFlipping(true);
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setTimeout(() => {
      setIsFlipping(false);
    }, 450);
  };

  // Capture a single frame from the live video element
  const captureSnapshot = useCallback(
    (targetSlotIndex?: number) => {
      const video = videoRef.current;
      if (!video) return null;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // If front camera, mirror image so it behaves like a natural mirror
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Trigger visual flash & audio sound
      setIsFlashing(true);
      playShutterSound();
      setTimeout(() => setIsFlashing(false), 200);

      const targetIdx = targetSlotIndex !== undefined ? targetSlotIndex : activeSlot;
      setPhotos((prev) => {
        const next = [...prev];
        next[targetIdx] = dataUrl;
        return next;
      });

      // Move active slot to the next one
      if (targetIdx + 1 < slotCount) {
        setActiveSlot(targetIdx + 1);
      }

      return dataUrl;
    },
    [activeSlot, facingMode, playShutterSound, slotCount]
  );

  // Countdown timer trigger
  const runCountdownAndCapture = (targetSlot: number, onDone?: () => void) => {
    let timeLeft = 3;
    setCountdown(timeLeft);

    const timer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(timer);
        setCountdown(null);
        captureSnapshot(targetSlot);
        if (onDone) onDone();
      } else {
        setCountdown(timeLeft);
      }
    }, 1000);
  };

  // Auto-Booth sequence: takes 4 shots automatically with 3s intervals
  const startAutoBooth = () => {
    if (!isCameraActive) {
      startCamera();
      return;
    }

    setIsAutoShooting(true);
    setPhotos([]);
    setActiveSlot(0);

    const poses = [
      'Pose 1: Senyuman Manis! ✨',
      'Pose 2: Tanda Peace / Mini Heart! ✌️',
      'Pose 3: Gaya Ceria / Lucu! 🤪',
      'Pose 4: Gaya Akhir Paling Meletup! 🎉',
    ];

    let currentStep = 0;

    const executeStep = (step: number) => {
      if (step >= slotCount) {
        setIsAutoShooting(false);
        setAutoShootMessage('');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
        return;
      }

      setAutoShootStep(step + 1);
      setAutoShootMessage(poses[step] || `Gaya Slot ${step + 1}`);

      runCountdownAndCapture(step, () => {
        // Wait 2.2 seconds between shots so guests can change their pose
        setTimeout(() => {
          currentStep += 1;
          executeStep(currentStep);
        }, 2200);
      });
    };

    executeStep(0);
  };

  // Upload image from phone gallery into currently active slot
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setPhotos((prev) => {
          const next = [...prev];
          next[activeSlot] = result;
          return next;
        });

        if (activeSlot + 1 < slotCount) {
          setActiveSlot(activeSlot + 1);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Clear a specific slot
  const clearSlot = (idx: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[idx] = '';
      return next;
    });
    setActiveSlot(idx);
  };

  // Reset all photos
  const resetAll = () => {
    setPhotos([]);
    setActiveSlot(0);
  };

  // Download high-resolution strip
  const handleDownload = async () => {
    if (photos.filter(Boolean).length === 0) return;
    setIsExporting(true);

    try {
      const validPhotos = photos.filter(Boolean);
      const dataUrl = await generatePhotoboothStripCanvas(
        validPhotos,
        selectedTheme,
        selectedFilter,
        eventInfo
      );

      const filename = `${eventInfo.welcomeTitle.replace(/\s+/g, '_')}_Photobooth_Strip.jpg`;

      // Auto backup to Google Drive in the background
      uploadPhotoToGoogleDrive({
        photoBase64: dataUrl,
        guestName: 'Photobooth',
        filename: filename,
      }).catch((err) => console.warn('Google Drive photobooth backup:', err));

      // Trigger native share sheet or direct download
      const result = await downloadStripImage(dataUrl, filename);

      // Open mobile save preview sheet
      setSavedStripModal({
        dataUrl,
        blobUrl: result.blobUrl || dataUrl,
        filename,
      });

      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error('Failed to export strip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Attach strip directly to guestbook
  const handleAttach = async () => {
    if (photos.filter(Boolean).length === 0 || !onAttachToGuestbook) return;

    // Check photo upload limit
    const { allowed, limit } = await isPhotoUploadAllowed();
    if (!allowed) {
      alert(
        language === 'ms'
          ? `Had muat naik foto sebanyak ${limit} keping telah dicapai. Anda tetap boleh memuat turun strip foto ke peranti!`
          : `Photo upload limit of ${limit} has been reached. You can still download your photobooth strip to your device!`
      );
      return;
    }

    setIsExporting(true);

    try {
      const validPhotos = photos.filter(Boolean);
      const dataUrl = await generatePhotoboothStripCanvas(
        validPhotos,
        selectedTheme,
        selectedFilter,
        eventInfo
      );
      onAttachToGuestbook(dataUrl);
    } catch (err) {
      console.error('Failed to attach strip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const hasPhotos = photos.filter(Boolean).length > 0;
  const isFull = photos.filter(Boolean).length === slotCount;

  return (
    <div className="w-full flex flex-col items-center animate-fade-in relative">
      {/* Screen flash effect */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white/95 pointer-events-none transition-opacity duration-150 gpu-layer" />
      )}

      {/* Hidden file input */}
      <input
        ref={fileUploadRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Studio Top Bar */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-warm-200/80 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-champagne-600 to-champagne-400 text-white flex items-center justify-center shadow-champagne">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif font-bold text-lg sm:text-xl text-warm-900">
                {t.photoboothTitle}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-champagne-100 text-champagne-800 text-[10px] font-bold uppercase tracking-wider">
                6 Strips
              </span>
            </div>
            <p className="text-xs text-warm-600">
              {t.photoboothSubtitle}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-warm-100 hover:bg-warm-200 text-warm-700 transition"
            title={language === 'ms' ? 'Tutup Studio' : 'Close Studio'}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Studio Main Workspace: 2-column on desktop, stacked on mobile */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Lg: 7 cols): Live Camera / Capture Station */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Live Camera Viewport */}
          <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black shadow-2xl border-2 border-champagne-300/60 flex items-center justify-center group">
            {/* 1. Live Video Element: ALWAYS in DOM, never conditionally unmounted */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
                setIsCameraReady(true);
                setIsCameraLoading(false);
              }}
              onPlaying={() => {
                setIsCameraReady(true);
                setIsCameraLoading(false);
              }}
              className={`w-full h-full object-cover transition-all duration-300 ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              } ${isCameraReady ? 'opacity-100 scale-100' : 'opacity-0 scale-98'} ${
                isFlipping ? 'opacity-30 blur-xs scale-95' : ''
              }`}
            />

            {/* 2. Loading / Permission Wait State Overlay */}
            {isCameraLoading && (
              <div className="absolute inset-0 bg-neutral-900/90 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 text-warm-200 z-20 animate-fade-in">
                <div className="relative mb-3.5">
                  <div className="w-12 h-12 rounded-full border-2 border-champagne-400/30 border-t-champagne-400 animate-spin" />
                  <Camera className="w-5 h-5 text-champagne-300 absolute inset-0 m-auto" />
                </div>
                <p className="font-serif italic text-base text-warm-100 mb-1">
                  {t.cameraConnecting}
                </p>
                <p className="text-xs text-warm-300/80 max-w-xs">
                  {t.cameraPermissionNote}
                </p>
              </div>
            )}

            {/* 3. Inactive or Error State Overlay */}
            {!isCameraLoading && !isCameraActive && (
              <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center text-center p-6 text-warm-300 z-20 animate-fade-in">
                <Camera className="w-12 h-12 mb-3 text-champagne-400 opacity-60" />
                <p className="font-serif italic text-base text-warm-100 mb-2">
                  {t.cameraInactive}
                </p>
                {cameraError ? (
                  <p className="text-xs text-rose-300 max-w-xs mb-4">{cameraError}</p>
                ) : (
                  <p className="text-xs text-warm-300/80 max-w-xs mb-4">
                    {t.cameraPermissionNote}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-champagne-500 hover:bg-champagne-600 text-warm-950 font-semibold text-xs transition shadow-md active:scale-95"
                  >
                    {t.enableCameraBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium text-xs transition border border-white/30 active:scale-95"
                  >
                    {t.chooseGalleryBtn}
                  </button>
                </div>
              </div>
            )}

            {/* 4. Top Live & Lens Status Badge */}
            {isCameraActive && isCameraReady && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10 animate-fade-in">
                <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[11px] font-medium text-warm-200 flex items-center gap-1.5 shadow-xs">
                  <Camera className="w-3 h-3 text-champagne-400" />
                  <span>{facingMode === 'user' ? t.frontCamera : t.rearCamera}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{t.liveBadge}</span>
                </div>
              </div>
            )}

            {/* 5. Countdown Overlay Display */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 animate-fade-in gpu-layer">
                <span className="font-serif text-8xl font-black text-champagne-300 drop-shadow-md gpu-layer scale-110 transition-transform duration-150">
                  {countdown}
                </span>
                <span className="text-sm font-sans tracking-widest uppercase font-semibold text-warm-200 mt-4">
                  {t.readyToPose}
                </span>
              </div>
            )}

            {/* 6. Auto-shoot Banner notification */}
            {isAutoShooting && autoShootMessage && (
              <div className="absolute top-4 left-4 right-4 z-20 px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xs sm:backdrop-blur-md text-white text-xs font-semibold flex items-center justify-between border border-champagne-400/40 shadow-lg animate-fade-down gpu-layer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>{autoShootMessage}</span>
                </span>
                <span className="text-champagne-300 font-mono text-[11px]">
                  Shot {autoShootStep}/{slotCount}
                </span>
              </div>
            )}

            {/* 7. Camera Floating Controls Overlay */}
            {isCameraActive && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                {/* Switch Front/Back Camera */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  disabled={isFlipping || isCameraLoading}
                  className="pointer-events-auto p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-md transition-all active:scale-90 disabled:opacity-50 flex items-center gap-1.5"
                  title={t.switchLens}
                >
                  <SwitchCamera className={`w-4 h-4 text-champagne-300 transition-transform duration-300 ${isFlipping ? 'rotate-180' : ''}`} />
                  <span className="text-[11px] font-medium hidden sm:inline">{t.switchLens}</span>
                </button>

                {/* Upload single slot file */}
                <button
                  type="button"
                  onClick={() => fileUploadRef.current?.click()}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium border border-white/20 shadow-md transition active:scale-95"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-champagne-300" />
                  <span>{t.chooseGalleryBtn}</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Camera Triggers */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Auto-Booth 4-Shots Button */}
            <button
              type="button"
              disabled={isAutoShooting || !isCameraReady}
              onClick={startAutoBooth}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-champagne-500 via-champagne-400 to-champagne-500 hover:from-champagne-600 hover:to-champagne-500 text-warm-950 font-bold text-sm tracking-wide shadow-champagne transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-warm-950" />
              <span>
                {isAutoShooting
                  ? `${t.takingShot} (${autoShootStep}/${slotCount})...`
                  : t.startAutoBooth.replace('{count}', String(slotCount))}
              </span>
            </button>

            {/* Snap Single Shot Button */}
            <button
              type="button"
              disabled={isAutoShooting || !isCameraReady}
              onClick={() => runCountdownAndCapture(activeSlot)}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white hover:bg-warm-50 border border-warm-200 text-warm-800 font-semibold text-sm transition shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-champagne-600" />
              <span>{t.takeSlot.replace('{slot}', String(activeSlot + 1))}</span>
            </button>
          </div>

          {/* Strip Info Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-warm-200/80 shadow-soft">
            <span className="text-xs font-semibold text-warm-700 flex items-center gap-1.5">
              <span>{t.activeFormat}</span>
              <span className="px-2 py-0.5 rounded-full bg-champagne-100 text-champagne-800 text-[11px] font-bold">
                {t.cutsLayout.replace('{count}', String(slotCount))}
              </span>
            </span>
            <span className="text-[11px] font-mono text-warm-500">
              {t.photosCount
                .replace('{current}', String(photos.filter(Boolean).length))
                .replace('{total}', String(slotCount))}
            </span>
          </div>

          {/* Strip Themes Selection Bar (6 Choices from Authentic Reference) */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-xs text-warm-700">
              <span className="font-bold flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-champagne-600" />
                <span>{t.chooseCollection}</span>
              </span>
              <span className="text-[11px] text-warm-500">{t.tapToChange}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PHOTOBOOTH_STRIP_THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`relative flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-colors active:scale-95 ${
                      isSelected
                        ? 'border-champagne-500 bg-champagne-50/95 shadow-champagne ring-2 ring-champagne-300'
                        : 'border-warm-200 bg-white/90 hover:bg-warm-50 hover:border-warm-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xl">{theme.icon}</span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-warm-100 text-warm-600 font-semibold">
                        {theme.slotCount} Cuts
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-champagne-950' : 'text-warm-800'
                      }`}
                    >
                      {theme.name}
                    </span>
                    <span className="text-[9px] text-warm-500 mt-0.5 line-clamp-1">
                      {theme.badge}
                    </span>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-champagne-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Filters Bar */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold text-warm-700">
              {language === 'ms' ? 'Penapis Warna Gambar (Filter)' : 'Photo Color Filters'}
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PHOTO_FILTERS.map((f) => {
                const isSelected = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.id)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition ${
                      isSelected
                        ? 'border-champagne-500 bg-champagne-50 text-champagne-950 font-bold ring-1 ring-champagne-300'
                        : 'border-warm-200 bg-white/80 text-warm-700 hover:bg-warm-100'
                    }`}
                  >
                    {f.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Lg: 5 cols): Live Strip Preview & Output Actions */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4 bg-warm-50/70 p-4 sm:p-5 rounded-3xl border border-warm-200/80">
          <div className="w-full flex items-center justify-between pb-2 border-b border-warm-200/60">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-700 flex items-center gap-1.5">
              <span>{language === 'ms' ? 'Pratonton Strip' : 'Strip Preview'}</span>
              <span className="text-[10px] font-normal lowercase text-warm-400">
                (live preview)
              </span>
            </span>

            {hasPhotos && (
              <button
                type="button"
                onClick={resetAll}
                className="text-[11px] font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'ms' ? 'Mula Semula' : 'Reset All'}</span>
              </button>
            )}
          </div>

          {/* Live Photobooth Strip Component */}
          <div className="w-full flex justify-center py-2 overflow-x-auto">
            <PhotoboothStripView
              photos={photos}
              themeId={selectedTheme}
              filterId={selectedFilter}
              activeSlotIndex={activeSlot}
              onSelectSlot={(idx) => setActiveSlot(idx)}
              onClearSlot={(idx) => clearSlot(idx)}
              eventInfo={eventInfo}
            />
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5 pt-2">
            {/* Download Strip Button */}
            <button
              type="button"
              disabled={!hasPhotos || isExporting}
              onClick={handleDownload}
              className="w-full py-3.5 px-4 rounded-2xl bg-champagne-600 hover:bg-champagne-700 text-white font-semibold text-sm transition shadow-champagne active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{language === 'ms' ? 'Menjana Strip HD...' : 'Generating HD Strip...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{t.downloadStrip}</span>
                </>
              )}
            </button>

            {/* Attach to Guestbook / Share Button */}
            {onAttachToGuestbook && (
              <button
                type="button"
                disabled={!hasPhotos || isExporting}
                onClick={handleAttach}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-warm-100 border border-warm-200 text-warm-900 font-semibold text-xs transition shadow-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                <span>{t.attachToGuestbook}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Save / Download Confirmation Modal */}
      {savedStripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm max-h-[90vh] bg-white rounded-3xl shadow-2xl p-5 flex flex-col items-center overflow-y-auto border border-warm-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSavedStripModal(null)}
              className="absolute top-3.5 right-3.5 p-2 rounded-full bg-warm-100 hover:bg-warm-200 text-warm-600 transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-100 text-champagne-900 text-[11px] font-bold mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-champagne-600" />
                <span>{language === 'ms' ? 'Strip Gambar HD Sedia!' : 'HD Strip Ready!'}</span>
              </span>
              <h3 className="font-serif text-lg font-bold text-warm-900">
                {language === 'ms' ? 'Simpan Photobooth Strip' : 'Save Your Photobooth Strip'}
              </h3>
            </div>

            {/* Strip Preview */}
            <div className="relative w-full max-w-[210px] my-2 rounded-xl overflow-hidden shadow-lg border border-warm-200/80 bg-warm-50 flex justify-center">
              <img
                src={savedStripModal.blobUrl || savedStripModal.dataUrl}
                alt="Photobooth Strip"
                className="w-full h-auto object-contain select-auto pointer-events-auto"
              />
            </div>

            {/* Mobile Long-Press Instruction Card */}
            <div className="w-full p-2.5 my-2 rounded-2xl bg-champagne-50/90 border border-champagne-200 text-left flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-champagne-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-warm-700 leading-snug">
                {language === 'ms' ? (
                  <>
                    <strong className="text-champagne-950">Tip Simpan Telefon:</strong> Tekan dan tahan (long-press) gambar di atas, kemudian pilih <em>'Simpan Imej' (Save to Photos)</em>.
                  </>
                ) : (
                  <>
                    <strong className="text-champagne-950">Mobile Tip:</strong> Tap and hold the image above, then select <em>'Save to Photos'</em>.
                  </>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => downloadStripImage(savedStripModal.dataUrl, savedStripModal.filename)}
                className="w-full py-3 px-4 rounded-xl bg-champagne-600 hover:bg-champagne-700 text-white font-semibold text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'ms' ? 'Muat Turun / Kongsi Semula' : 'Download / Share Again'}</span>
              </button>

              {onAttachToGuestbook && (
                <button
                  type="button"
                  onClick={() => {
                    const dataUrl = savedStripModal.dataUrl;
                    setSavedStripModal(null);
                    onAttachToGuestbook(dataUrl);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-warm-100 border border-warm-200 text-warm-900 font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                  <span>{t.attachToGuestbook}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSavedStripModal(null)}
                className="w-full py-1.5 text-warm-500 hover:text-warm-800 text-xs font-medium transition"
              >
                {language === 'ms' ? 'Tutup' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
