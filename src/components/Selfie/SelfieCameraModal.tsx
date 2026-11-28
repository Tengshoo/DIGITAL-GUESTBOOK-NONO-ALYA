'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  Search,
  CircleOff,
  RotateCcw,
  Check,
  Download,
  Image as ImageIcon,
  Camera,
  Sparkles,
  Timer,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  SELFIE_FRAMES,
  SelfieFrameId,
  SelfieFrameOverlay,
  getSelfieEventMeta,
  renderSelfieWithFrameToCanvas,
} from './selfieFrames';
import { PHOTO_FILTERS, PhotoFilter } from '@/components/PhotoFilterSelector';
import { downloadStripImage } from '@/lib/photoboothCanvas';
import { useLanguage } from '@/lib/i18n';
import { EVENT_CONFIG } from '@/config/eventConfig';

interface SelfieCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (framedSelfieDataUrl: string) => void;
}

const ZOOM_STEPS = [1, 1.5, 2] as const;
const MAX_VIDEO_SECONDS = 30;

export default function SelfieCameraModal({
  isOpen,
  onClose,
  onCaptureComplete,
}: SelfieCameraModalProps) {
  const { language } = useLanguage();
  const meta = useMemo(() => getSelfieEventMeta(), []);

  const selfieConfig = (
    EVENT_CONFIG as typeof EVENT_CONFIG & {
      selfie?: {
        defaultFrame?: string;
        badgeText?: string;
        allowVideo?: boolean;
      };
    }
  ).selfie;

  const initialFrameId: SelfieFrameId =
    SELFIE_FRAMES.some((f) => f.id === selfieConfig?.defaultFrame)
      ? (selfieConfig!.defaultFrame as SelfieFrameId)
      : 'wds01';
  const allowVideo = selfieConfig?.allowVideo !== false;

  const [selectedFrame, setSelectedFrame] = useState<SelfieFrameId>(initialFrameId);
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilter['id']>('original');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number>(0);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');

  // Camera & stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamHasAudioRef = useRef<boolean>(false);
  const cameraReqIdRef = useRef<number>(0);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [transitionPosterUrl, setTransitionPosterUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isScreenFlashing, setIsScreenFlashing] = useState<boolean>(false);

  // Video recording state (up to 30s)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoCoverSnapshotRef = useRef<string | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const stopDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoFile, setRecordedVideoFile] = useState<File | null>(null);
  const [isReviewMuted, setIsReviewMuted] = useState<boolean>(true);
  const [videoStatusToast, setVideoStatusToast] = useState<string | null>(null);

  // Photo review state (strictly separate from recordedVideoUrl so video never shows as a photo!)
  const [rawCapturedUrl, setRawCapturedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Frame Explorer / Search Drawer state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Touch swipe tracking for switching frames horizontally
  const touchStartXRef = useRef<number | null>(null);

  const zoomLevel = ZOOM_STEPS[zoomIndex];
  const activeFrameIndex = Math.max(
    0,
    SELFIE_FRAMES.findIndex((f) => f.id === selectedFrame)
  );
  const currentFilterObj =
    PHOTO_FILTERS.find((f) => f.id === selectedFilter) || PHOTO_FILTERS[0];
  const isInReview = Boolean(rawCapturedUrl || recordedVideoUrl);

  const showToast = useCallback((msg: string) => {
    setVideoStatusToast(msg);
    setTimeout(() => {
      setVideoStatusToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(860, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.075);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.075);
    } catch {
      // ignore
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraReqIdRef.current += 1;
    if (stopDelayTimeoutRef.current) {
      clearTimeout(stopDelayTimeoutRef.current);
      stopDelayTimeoutRef.current = null;
    }
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    streamHasAudioRef.current = false;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsRecordingVideo(false);
    setIsCameraReady(false);
    setTransitionPosterUrl(null);
  }, []);

  const grabVideoFrameDataUrl = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const targetW = 1080;
    const targetH = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = targetW / targetH;
    const videoRatio = vw / vh;

    let cropW = vw;
    let cropH = vh;
    if (videoRatio > targetRatio) {
      cropW = vh * targetRatio;
    } else {
      cropH = vw / targetRatio;
    }

    cropW = cropW / zoomLevel;
    cropH = cropH / zoomLevel;
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;

    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [facingMode, zoomLevel]);

  /**
   * Starts a unified WebRTC stream (`video` only for Photo mode, or unified `video + audio` for Video mode).
   * Never calls a second `getUserMedia` during recording — eliminating the iOS Safari black-screen bug!
   */
  const startCamera = useCallback(
    async (wantAudio = false, targetFacing: 'user' | 'environment' = facingMode) => {
      if (!isOpen) return;
      const reqId = ++cameraReqIdRef.current;

      // Capture seamless freeze-frame before releasing old track so switching modes/lenses never flashes black
      const poster = grabVideoFrameDataUrl();
      if (poster) {
        setTransitionPosterUrl(poster);
      } else {
        setIsCameraLoading(true);
      }
      setCameraError(null);
      setIsCameraReady(false);

      try {
        const hadExistingStream = Boolean(streamRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        streamHasAudioRef.current = false;

        if (hadExistingStream) {
          await new Promise((r) => setTimeout(r, 120));
        }
        if (reqId !== cameraReqIdRef.current) return;

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            language === 'ms'
              ? 'Kamera tidak disokong pada pelayar ini. Anda masih boleh muat naik dari galeri!'
              : 'Camera not supported in this browser. You can still pick a photo from gallery!'
          );
        }

        let stream: MediaStream | null = null;
        let gotAudio = false;

        // 1. If Video mode wants audio, request ONE unified (video + audio) stream first
        if (wantAudio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: targetFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
              },
            });
            gotAudio = stream.getAudioTracks().length > 0;
          } catch {
            // Mic denied or overconstrained: fall through cleanly to video-only stream
            stream = null;
            gotAudio = false;
          }
        }

        // 2. Video-only stream (default for Photo mode, or fallback if mic permission was declined)
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: targetFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
              },
              audio: false,
            });
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: targetFacing },
                audio: false,
              });
            } catch {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            }
          }
        }

        if (reqId !== cameraReqIdRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        streamHasAudioRef.current = gotAudio;

        const video = videoRef.current;
        if (video) {
          // Live preview <video> MUST always stay muted so speakers never feedback-screech
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.srcObject = stream;

          let markedReady = false;
          const markReady = () => {
            if (markedReady || reqId !== cameraReqIdRef.current) return;
            markedReady = true;
            setIsCameraReady(true);
            setIsCameraLoading(false);
            setTransitionPosterUrl(null);
          };

          const attemptPlay = async () => {
            try {
              await video.play();
              markReady();
            } catch {
              // Safari/WebView will fire onloadeddata / onplaying
            }
          };

          video.onloadedmetadata = attemptPlay;
          video.onloadeddata = markReady;
          video.onplaying = markReady;

          if (video.readyState >= 2) {
            await attemptPlay();
            markReady();
          } else {
            attemptPlay();
          }
        } else {
          setIsCameraLoading(false);
          setTransitionPosterUrl(null);
        }
      } catch (err: unknown) {
        if (reqId !== cameraReqIdRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : language === 'ms'
            ? 'Sila benarkan akses kamera pelayar untuk mengambil selfie.'
            : 'Please allow camera access in your browser to take a selfie.';
        setCameraError(msg);
        setIsCameraLoading(false);
        setIsCameraReady(false);
        setTransitionPosterUrl(null);
      }
    },
    [facingMode, grabVideoFrameDataUrl, isOpen, language]
  );

  // Switch between Photo & Video modes cleanly inside user click gesture
  const handleSelectCaptureMode = (nextMode: 'photo' | 'video') => {
    if (isRecordingVideo || nextMode === captureMode) return;
    setCaptureMode(nextMode);

    if (nextMode === 'video') {
      // Upgrade to unified video+audio stream right on tab tap (so Record tap needs 0 getUserMedia calls!)
      if (!streamRef.current || !streamHasAudioRef.current) {
        startCamera(true, facingMode);
      } else {
        streamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
      }
    } else if (streamRef.current) {
      // Switching Video -> Photo: simply mute audio tracks in 0ms without restarting camera!
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
  };

  // Flip front/rear lens cleanly preserving audio if in Video mode
  const handleFlipCamera = () => {
    if (isRecordingVideo) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(captureMode === 'video', nextFacing);
  };

  // Initialize camera when modal opens or when returning from Review -> Live view
  useEffect(() => {
    if (isOpen && !isInReview) {
      if (!streamRef.current) {
        startCamera(captureMode === 'video', facingMode);
      }
    } else if (!isOpen) {
      stopCamera();
      setRawCapturedUrl(null);
      setRecordedVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setRecordedVideoFile(null);
      videoCoverSnapshotRef.current = null;
      setCountdown(null);
      setIsSearchOpen(false);
      setVideoStatusToast(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isInReview]);

  // Lock page & viewport scrolling completely while Selfie Camera is open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const scrollY = window.scrollY;

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    const preventScrollOutsideScrollables = (e: TouchEvent | WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-selfie-scrollable="true"]')) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScrollOutsideScrollables, {
      passive: false,
    });
    document.addEventListener('wheel', preventScrollOutsideScrollables, {
      passive: false,
    });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      document.removeEventListener('touchmove', preventScrollOutsideScrollables);
      document.removeEventListener('wheel', preventScrollOutsideScrollables);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Double-safety attachment if <video> mounts a frame later
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (isOpen && !isInReview && video && stream && video.srcObject !== stream) {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.srcObject = stream;
      video
        .play()
        .then(() => {
          setIsCameraReady(true);
          setIsCameraLoading(false);
          setTransitionPosterUrl(null);
        })
        .catch(() => {});
    }
  });

  // Resume playback automatically if mobile user returns from OS permission sheet / background
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

  // Apply rear torch constraint when flashEnabled toggles (if supported by device)
  useEffect(() => {
    if (!streamRef.current || facingMode !== 'environment') return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (capabilities?.torch) {
        track
          .applyConstraints({
            advanced: [{ torch: flashEnabled } as MediaTrackConstraintSet],
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [flashEnabled, facingMode]);

  const performSnapshot = useCallback(() => {
    const doCapture = () => {
      const rawData = grabVideoFrameDataUrl();
      if (!rawData) return;
      playShutterSound();
      setRawCapturedUrl(rawData);
      stopCamera();
    };

    if (flashEnabled) {
      setIsScreenFlashing(true);
      setTimeout(() => {
        doCapture();
        setTimeout(() => setIsScreenFlashing(false), 180);
      }, 160);
    } else {
      setIsScreenFlashing(true);
      doCapture();
      setTimeout(() => setIsScreenFlashing(false), 130);
    }
  }, [flashEnabled, grabVideoFrameDataUrl, playShutterSound, stopCamera]);

  const finalizeStopRecording = useCallback(() => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        setIsRecordingVideo(false);
      }
    } else {
      setIsRecordingVideo(false);
    }
  }, []);

  const stopVideoRecording = useCallback(() => {
    if (stopDelayTimeoutRef.current) return;
    // Guarantee at least 750ms of encoded frames so iOS/Android muxers always write a valid MP4/WebM header
    const elapsedMs = Date.now() - recordStartTimeRef.current;
    if (elapsedMs < 750) {
      stopDelayTimeoutRef.current = setTimeout(() => {
        stopDelayTimeoutRef.current = null;
        finalizeStopRecording();
      }, 750 - elapsedMs);
      return;
    }
    finalizeStopRecording();
  }, [finalizeStopRecording]);

  /**
   * Starts video recording immediately on the already-live stream (0 getUserMedia calls!).
   * Uses non-fragmented `recorder.start()` (no timeslice) so iOS Safari AVAssetWriter & Android Chrome
   * produce a complete, standards-compliant MP4/WebM file that plays and saves to Camera Roll cleanly.
   */
  const startVideoRecording = useCallback(() => {
    if (!streamRef.current || isRecordingVideo) return;

    if (typeof MediaRecorder === 'undefined') {
      showToast(
        language === 'ms'
          ? 'Rakaman video tidak disokong pada pelayar ini.'
          : 'Video recording is not supported in this browser.'
      );
      return;
    }

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      startCamera(true, facingMode);
      return;
    }

    // Store cover frame in a ref ONLY (never set rawCapturedUrl unless user taps "Attach Cover")
    videoCoverSnapshotRef.current = grabVideoFrameDataUrl();
    recordedChunksRef.current = [];
    setRecordingSeconds(0);
    setIsReviewMuted(true);

    // Ensure audio tracks are enabled if available
    const activeAudioTracks = streamRef.current
      .getAudioTracks()
      .filter((t) => t.readyState === 'live');
    activeAudioTracks.forEach((t) => {
      t.enabled = true;
    });

    const recordStream = new MediaStream([videoTrack, ...activeAudioTracks]);

    // Standard container candidates (prefer MP4 for iOS Safari / Camera Roll compatibility)
    const mimeCandidates = [
      'video/mp4',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
    ];

    const supportedMime =
      mimeCandidates.find((m) => {
        try {
          return MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      }) || '';

    try {
      let recorder: MediaRecorder;
      try {
        const opts: MediaRecorderOptions = { videoBitsPerSecond: 2_500_000 };
        if (supportedMime) opts.mimeType = supportedMime;
        recorder = new MediaRecorder(recordStream, opts);
      } catch {
        recorder = supportedMime
          ? new MediaRecorder(recordStream, { mimeType: supportedMime })
          : new MediaRecorder(recordStream);
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onerror = () => {
        if (videoTimerRef.current) {
          clearInterval(videoTimerRef.current);
          videoTimerRef.current = null;
        }
        setIsRecordingVideo(false);
        showToast(
          language === 'ms'
            ? 'Ralat rakaman video. Sila cuba lagi.'
            : 'Video recording failed. Please try again.'
        );
      };

      recorder.onstop = () => {
        if (videoTimerRef.current) {
          clearInterval(videoTimerRef.current);
          videoTimerRef.current = null;
        }
        setIsRecordingVideo(false);

        // Grab latest frame right before stopping camera if cover wasn't captured earlier
        if (!videoCoverSnapshotRef.current) {
          videoCoverSnapshotRef.current = grabVideoFrameDataUrl();
        }

        const rawMime = (recorder.mimeType || supportedMime || 'video/mp4').toLowerCase();
        // Strip `;codecs=...` so iOS Safari & Android `navigator.canShare({ files })` accepts the File!
        const cleanMime = rawMime.includes('mp4') ? 'video/mp4' : 'video/webm';
        const ext = cleanMime === 'video/mp4' ? 'mp4' : 'webm';

        const blob = new Blob(recordedChunksRef.current, { type: cleanMime });
        if (blob.size < 512) {
          showToast(
            language === 'ms'
              ? 'Video terlalu pendek. Tekan rakam sekurang-kurangnya 1 saat.'
              : 'Clip too short. Hold or record for at least 1 second.'
          );
          return;
        }

        const safeCouple = meta.fullCoupleName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeCouple}_Video_${Date.now()}.${ext}`;
        const file = new File([blob], filename, {
          type: cleanMime,
          lastModified: Date.now(),
        });
        const url = URL.createObjectURL(blob);

        setRecordedVideoFile(file);
        setRecordedVideoUrl(url);
        stopCamera();
      };

      mediaRecorderRef.current = recorder;
      recordStartTimeRef.current = Date.now();
      // Start WITHOUT timeslice so WebKit/Chrome muxes a single non-fragmented MP4/WebM container!
      recorder.start();
      setIsRecordingVideo(true);

      let elapsed = 0;
      videoTimerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingSeconds(elapsed);
        if (elapsed >= MAX_VIDEO_SECONDS) {
          finalizeStopRecording();
        }
      }, 1000);
    } catch {
      setIsRecordingVideo(false);
      showToast(
        language === 'ms'
          ? 'Rakaman video tidak dapat dimulakan pada peranti ini.'
          : 'Could not start video recording on this device.'
      );
    }
  }, [
    facingMode,
    finalizeStopRecording,
    grabVideoFrameDataUrl,
    isRecordingVideo,
    language,
    meta.fullCoupleName,
    showToast,
    startCamera,
    stopCamera,
  ]);

  const handleShutterPress = () => {
    if (countdown !== null) return;

    if (isRecordingVideo) {
      stopVideoRecording();
      return;
    }

    if (!isCameraReady) {
      startCamera(captureMode === 'video', facingMode);
      return;
    }

    if (captureMode === 'video') {
      startVideoRecording();
      return;
    }

    if (timerEnabled) {
      let remaining = 3;
      setCountdown(remaining);
      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(null);
          performSnapshot();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    } else {
      performSnapshot();
    }
  };

  const handleRetake = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecordedVideoFile(null);
    videoCoverSnapshotRef.current = null;
    setRawCapturedUrl(null);
    setRecordingSeconds(0);
    setIsReviewMuted(false);
  };

  const toggleReviewAudio = () => {
    const nextMuted = !isReviewMuted;
    setIsReviewMuted(nextMuted);
    if (reviewVideoRef.current) {
      reviewVideoRef.current.muted = nextMuted;
      reviewVideoRef.current.play().catch(() => {});
    }
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        stopCamera();
        setRawCapturedUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSelfie = async () => {
    const sourceImage = rawCapturedUrl || videoCoverSnapshotRef.current;
    if (!sourceImage || isProcessing) return;
    setIsProcessing(true);
    try {
      const finalJpeg = await renderSelfieWithFrameToCanvas(
        sourceImage,
        selectedFrame,
        selectedFilter
      );
      onCaptureComplete(finalJpeg);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Saves recorded video (or photo) to user's phone / computer.
   * Crucially executes `navigator.share({ files })` SYNCHRONOUSLY inside the user tap gesture
   * (zero preceding `await`s!) with a clean `'video/mp4'` / `'video/webm'` File so iOS Safari
   * & Android Chrome open the native "Save Video" sheet every single time!
   */
  const handleSaveVideoSync = () => {
    if (!recordedVideoFile || !recordedVideoUrl) return;

    const isMobileDevice =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (
      isMobileDevice &&
      typeof navigator.share === 'function' &&
      (!navigator.canShare || navigator.canShare({ files: [recordedVideoFile] }))
    ) {
      navigator
        .share({
          files: [recordedVideoFile],
          title: recordedVideoFile.name,
          text: `${meta.fullCoupleName} Celebration Video`,
        })
        .then(() => {
          showToast(language === 'ms' ? 'Video sedia disimpan!' : 'Video shared / saved!');
        })
        .catch((err) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          // Fallback to anchor download if share was rejected
          const a = document.createElement('a');
          a.href = recordedVideoUrl;
          a.download = recordedVideoFile.name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
          }, 2000);
        });
      return;
    }

    // Desktop & standard browsers: direct file download
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = recordedVideoFile.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 2000);
    showToast(language === 'ms' ? 'Memuat turun video...' : 'Downloading video...');
  };

  const handleSavePhotoToDevice = async () => {
    if (!rawCapturedUrl || isProcessing) return;
    setIsProcessing(true);
    try {
      const safeCouple = meta.fullCoupleName.replace(/[^a-zA-Z0-9]/g, '_');
      const finalJpeg = await renderSelfieWithFrameToCanvas(
        rawCapturedUrl,
        selectedFrame,
        selectedFilter
      );
      await downloadStripImage(finalJpeg, `${safeCouple}_Selfie_${Date.now()}.jpg`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || isSearchOpen || isRecordingVideo) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) > 42) {
      if (deltaX < 0 && activeFrameIndex < SELFIE_FRAMES.length - 1) {
        setSelectedFrame(SELFIE_FRAMES[activeFrameIndex + 1].id);
      } else if (deltaX > 0 && activeFrameIndex > 0) {
        setSelectedFrame(SELFIE_FRAMES[activeFrameIndex - 1].id);
      }
    }
  };

  const filteredFrames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SELFIE_FRAMES;
    return SELFIE_FRAMES.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const ITEM_SLOT_PX = 56;
  const activeVideoFilterStyle =
    currentFilterObj.id === 'original' ? undefined : currentFilterObj.cssFilter;

  return (
    <div className="fixed inset-0 z-[70] w-full h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none touch-none bg-black flex flex-col items-center justify-between sm:justify-center pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:py-3 select-none animate-fade-in">
      {/* Hidden Gallery Picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={handleGalleryPick}
        className="hidden"
      />

      {/* Main 9:16 Portrait Camera / Review Card — strictly sized within 100dvh */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 min-h-0 w-full max-w-[430px] sm:max-w-[385px] sm:flex-initial sm:aspect-[9/16] sm:h-[calc(100dvh-80px)] sm:w-auto sm:rounded-[28px] overflow-hidden bg-[#080808] sm:border sm:border-white/15 shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex items-center justify-center"
      >
        {/* Screen Illumination Flash Overlay */}
        {isScreenFlashing && (
          <div className="absolute inset-0 z-50 bg-white animate-fade-in pointer-events-none" />
        )}

        {/* Status Toast Notification */}
        {videoStatusToast && (
          <div className="absolute top-16 inset-x-6 z-50 flex justify-center pointer-events-none animate-fade-down">
            <div className="px-4 py-2 rounded-full bg-black/80 border border-white/20 text-white text-xs font-medium backdrop-blur-md shadow-xl">
              {videoStatusToast}
            </div>
          </div>
        )}

        {/* Top Studio Controls Bar */}
        <div className="absolute top-3.5 inset-x-3.5 z-30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close selfie camera"
              className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 border border-white/15 text-white flex items-center justify-center backdrop-blur-md transition active:scale-95"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {isRecordingVideo ? (
              <div className="px-3.5 py-1.5 rounded-full bg-rose-600/95 border border-rose-400/60 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="font-mono text-[11px] font-bold tracking-wider text-white">
                  REC 00:{String(recordingSeconds).padStart(2, '0')} / 00:30
                </span>
              </div>
            ) : recordedVideoUrl ? (
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-600/85 border border-emerald-400/40 backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white">
                  {language === 'ms' ? 'PRATONTON VIDEO' : 'VIDEO PREVIEW'}
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-1.5 rounded-full bg-black/50 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/95">
                  {selfieConfig?.badgeText?.trim() ||
                    (language === 'ms' ? 'DIKONGSI BERSAMA SEMUA' : 'SHARED WITH EVERYONE')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {recordedVideoUrl && (
              <button
                type="button"
                onClick={toggleReviewAudio}
                aria-label={isReviewMuted ? 'Unmute video' : 'Mute video'}
                className="w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition active:scale-90"
                title={isReviewMuted ? 'Tap to unmute' : 'Mute'}
              >
                {isReviewMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            )}

            {!isInReview && !isRecordingVideo && (
              <>
                {captureMode === 'photo' && (
                  <button
                    type="button"
                    onClick={() => setTimerEnabled((prev) => !prev)}
                    aria-label="Toggle 3s timer"
                    className={`w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-md transition active:scale-90 ${
                      timerEnabled
                        ? 'bg-white text-black border-white'
                        : 'bg-black/45 hover:bg-black/70 border-white/15 text-white/90'
                    }`}
                    title={timerEnabled ? '3s Timer On' : '3s Timer Off'}
                  >
                    <Timer className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleFlipCamera}
                  aria-label="Flip camera"
                  className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center backdrop-blur-md transition active:scale-90"
                  title={language === 'ms' ? 'Tukar kamera' : 'Flip camera'}
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setFlashEnabled((prev) => !prev)}
                  aria-label="Toggle flash"
                  className={`w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-md transition active:scale-90 ${
                    flashEnabled
                      ? 'bg-amber-400/90 border-amber-300 text-black shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                      : 'bg-black/45 hover:bg-black/70 border-white/15 text-white/90'
                  }`}
                  title={flashEnabled ? 'Flash On' : 'Flash Off'}
                >
                  {flashEnabled ? (
                    <Zap className="w-4 h-4 fill-current" />
                  ) : (
                    <ZapOff className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Camera Video OR Captured Review Media */}
        {recordedVideoUrl ? (
          <video
            key={recordedVideoUrl}
            ref={reviewVideoRef}
            src={recordedVideoUrl}
            preload="auto"
            playsInline
            muted={isReviewMuted}
            autoPlay
            loop
            controls={false}
            onLoadedMetadata={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            onClick={toggleReviewAudio}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
            style={{
              transform: facingMode === 'user' ? 'scaleX(-1) translateZ(0)' : 'translateZ(0)',
              filter: activeVideoFilterStyle,
            }}
          />
        ) : rawCapturedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rawCapturedUrl}
            alt="Captured selfie preview"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: activeVideoFilterStyle }}
          />
        ) : (
          <>
            {/* Seamless freeze-frame poster shown briefly during Photo <-> Video or Front <-> Rear switch */}
            {transitionPosterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={transitionPosterUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-[2px] scale-[1.01] z-[1]"
              />
            )}

            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 will-change-transform"
              style={{
                transform: `${
                  facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)'
                } scale(${zoomLevel}) translateZ(0)`,
                filter: activeVideoFilterStyle,
              }}
            />

            {/* Loading / Camera Permission Fallback */}
            {((isCameraLoading && !transitionPosterUrl) || cameraError) && (
              <div className="relative z-20 px-6 text-center flex flex-col items-center gap-3 max-w-xs">
                {isCameraLoading ? (
                  <>
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <p className="text-xs text-white/75 tracking-wide">
                      {language === 'ms' ? 'Menyambungkan kamera...' : 'Starting camera...'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Camera className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">{cameraError}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => startCamera(captureMode === 'video', facingMode)}
                        className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-white/90 transition"
                      >
                        {language === 'ms' ? 'Cuba Lagi' : 'Enable Camera'}
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-4 py-2 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold hover:bg-white/25 transition"
                      >
                        {language === 'ms' ? 'Pilih Galeri' : 'Upload Photo'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* 3-Second Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 pointer-events-none">
            <span className="font-serif text-7xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] animate-ping">
              {countdown}
            </span>
          </div>
        )}

        {/* Live 9:16 Wedding/Engagement Frame Overlay */}
        <SelfieFrameOverlay frameId={selectedFrame} meta={meta} isReviewMode={isInReview} />

        {/* Floating Search / Frame & Filter Explorer Button */}
        {!isRecordingVideo && (
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Browse frames and filters"
            className="absolute right-4 bottom-[86px] z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition active:scale-90"
            title={language === 'ms' ? 'Cari bingkai & filter' : 'Browse frames & filters'}
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Bottom Circular Frame Carousel + Centered Shutter Ring */}
        {!isInReview ? (
          <div className="absolute inset-x-0 bottom-3.5 z-30 h-[72px] flex items-center justify-center overflow-hidden">
            {!isRecordingVideo && (
              <div
                className="flex items-center transition-transform duration-200 ease-out"
                style={{
                  transform: `translateX(calc(50% - ${
                    activeFrameIndex * ITEM_SLOT_PX + ITEM_SLOT_PX / 2
                  }px))`,
                }}
              >
                {SELFIE_FRAMES.map((frame, idx) => {
                  const isSelected = idx === activeFrameIndex;
                  return (
                    <div
                      key={frame.id}
                      style={{ width: `${ITEM_SLOT_PX}px` }}
                      className="flex items-center justify-center shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleShutterPress();
                          } else {
                            setSelectedFrame(frame.id);
                          }
                        }}
                        aria-label={
                          isSelected ? `Capture with ${frame.name}` : `Select ${frame.name}`
                        }
                        className={`rounded-full flex flex-col items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'w-[54px] h-[54px] bg-white/10 backdrop-blur-sm text-white'
                            : 'w-11 h-11 bg-black/55 hover:bg-black/75 border border-white/30 backdrop-blur-md text-white/85 scale-95 hover:scale-100'
                        }`}
                      >
                        {frame.id === 'none' ? (
                          <CircleOff className="w-4 h-4 text-white/85" />
                        ) : (
                          <>
                            <span
                              className="text-[7px] font-mono tracking-widest uppercase leading-none opacity-80"
                              style={{ color: frame.accent }}
                            >
                              {frame.code}
                            </span>
                            <span className="text-[8px] font-semibold leading-tight mt-0.5 truncate max-w-[40px] px-0.5 text-white">
                              {frame.name.split(' ')[0]}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stationary Outer White Shutter Ring */}
            <button
              type="button"
              onClick={handleShutterPress}
              aria-label={isRecordingVideo ? 'Stop recording' : 'Take selfie'}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66px] h-[66px] rounded-full border-[3.5px] shadow-[0_0_20px_rgba(0,0,0,0.75)] active:scale-90 transition-all flex items-center justify-center bg-transparent ${
                isRecordingVideo ? 'border-rose-400 scale-105' : 'border-white'
              }`}
            >
              {isRecordingVideo ? (
                <Square className="w-6 h-6 text-rose-500 fill-rose-500 rounded-sm" />
              ) : captureMode === 'video' ? (
                <span className="w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.85)]" />
              ) : null}
            </button>
          </div>
        ) : (
          /* In Review Mode: Frame Quick-Switch Strip at Bottom of Card */
          <div
            data-selfie-scrollable="true"
            className="absolute inset-x-3 bottom-3 z-30 flex items-center gap-1.5 overflow-x-auto touch-pan-x overscroll-contain py-1 px-1"
          >
            {SELFIE_FRAMES.map((frame) => {
              const active = selectedFrame === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => setSelectedFrame(frame.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 backdrop-blur-md border transition ${
                    active
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-black/55 text-white/85 border-white/20 hover:bg-black/75'
                  }`}
                >
                  {frame.id === 'none' ? 'No Frame' : `${frame.code} • ${frame.name}`}
                </button>
              );
            })}
          </div>
        )}

        {/* Frame & Filter Search / Explorer Drawer */}
        {isSearchOpen && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl p-4 flex flex-col gap-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-champagne-300" />
                <h4 className="text-xs font-bold tracking-[0.16em] uppercase text-white">
                  {language === 'ms' ? 'Koleksi Bingkai & Filter' : 'Frames & Tone Filters'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'ms'
                    ? 'Cari bingkai (cth: WDS01, Royal, Vogue)...'
                    : 'Search frames (e.g. WDS01, Royal, Vogue)...'
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-white/45 focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55 mb-1.5">
                {language === 'ms' ? 'Tona Warna' : 'Color Tone'}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {PHOTO_FILTERS.map((flt) => {
                  const active = selectedFilter === flt.id;
                  return (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => setSelectedFilter(flt.id)}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition ${
                        active
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.08] text-white/80 border-white/15 hover:bg-white/15'
                      }`}
                    >
                      {flt.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              data-selfie-scrollable="true"
              className="flex-1 min-h-0 overflow-y-auto touch-pan-y overscroll-contain grid grid-cols-2 gap-2 pr-0.5"
            >
              {filteredFrames.map((frame) => {
                const active = selectedFrame === frame.id;
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => {
                      setSelectedFrame(frame.id);
                      setIsSearchOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between min-h-[82px] transition ${
                      active
                        ? 'bg-white/20 border-white ring-1 ring-white'
                        : 'bg-white/[0.06] border-white/15 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/50"
                        style={{ color: frame.accent }}
                      >
                        {frame.code}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-white leading-tight">
                        {frame.name}
                      </p>
                      <p className="text-[10px] text-white/55">{frame.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Pill Bar Below the 9:16 Card */}
      <div className="shrink-0 w-full max-w-[430px] sm:max-w-[385px] px-4 py-2.5 sm:pt-3 sm:pb-0 flex items-center justify-center gap-2.5">
        {!isInReview ? (
          <>
            {/* Zoom Step Pill (1x -> 1.5x -> 2x) */}
            <button
              type="button"
              disabled={isRecordingVideo}
              onClick={() => setZoomIndex((prev) => (prev + 1) % ZOOM_STEPS.length)}
              className="w-10 h-10 rounded-full bg-[#151515] hover:bg-[#222] border border-white/15 text-white text-xs font-bold flex items-center justify-center transition active:scale-90 disabled:opacity-50"
              title="Zoom"
            >
              {zoomLevel}x
            </button>

            {/* Capture Mode Pill (● Video · 30s | Photo) */}
            <div className="bg-[#151515] border border-white/15 rounded-full p-1 flex items-center">
              {allowVideo && (
                <button
                  type="button"
                  disabled={isRecordingVideo}
                  onClick={() => handleSelectCaptureMode('video')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                    captureMode === 'video'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-white/85 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Video · 30s</span>
                </button>
              )}

              <button
                type="button"
                disabled={isRecordingVideo}
                onClick={() => handleSelectCaptureMode('photo')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
                  captureMode === 'photo'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                Photo
              </button>
            </div>

            {/* Quick Gallery Upload Button */}
            <button
              type="button"
              disabled={isRecordingVideo}
              onClick={() => galleryInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-[#151515] hover:bg-[#222] border border-white/15 text-white/85 hover:text-white flex items-center justify-center transition active:scale-90 disabled:opacity-50"
              title={language === 'ms' ? 'Pilih dari galeri' : 'Choose from gallery'}
              aria-label="Choose photo from gallery"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </>
        ) : recordedVideoUrl ? (
          /* Video Review Action Bar: Retake | Attach Cover | Save Video (Primary) */
          <div className="w-full flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRetake}
              disabled={isProcessing}
              className="px-3.5 py-2.5 rounded-full bg-[#181818] hover:bg-[#252525] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'ms' ? 'Semula' : 'Retake'}</span>
            </button>

            {videoCoverSnapshotRef.current && (
              <button
                type="button"
                onClick={handleConfirmSelfie}
                disabled={isProcessing}
                className="px-3.5 py-2.5 rounded-full bg-[#181818] hover:bg-[#252525] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60"
                title={
                  language === 'ms'
                    ? 'Lampirkan gambar muka depan video ke Ucapan'
                    : 'Attach framed cover snapshot to Guestbook Wish'
                }
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'ms' ? 'Guna Foto' : 'Use Cover'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveVideoSync}
              className="flex-1 py-2.5 px-5 rounded-full bg-white hover:bg-warm-100 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'ms' ? 'Simpan Video' : 'Save Video'}</span>
            </button>
          </div>
        ) : (
          /* Photo Review Action Bar */
          <div className="w-full flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRetake}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-full bg-[#181818] hover:bg-[#252525] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'ms' ? 'Ambil Semula' : 'Retake'}</span>
            </button>

            <button
              type="button"
              onClick={handleSavePhotoToDevice}
              disabled={isProcessing}
              className="px-3.5 py-2.5 rounded-full bg-[#181818] hover:bg-[#252525] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title={language === 'ms' ? 'Simpan ke telefon' : 'Save to phone'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmSelfie}
              disabled={isProcessing || !rawCapturedUrl}
              className="flex-1 py-2.5 px-5 rounded-full bg-white hover:bg-warm-100 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95 disabled:opacity-60"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isProcessing
                  ? language === 'ms'
                    ? 'Memproses...'
                    : 'Saving...'
                  : language === 'ms'
                  ? 'Guna Selfie Ini'
                  : 'Use Photo'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
