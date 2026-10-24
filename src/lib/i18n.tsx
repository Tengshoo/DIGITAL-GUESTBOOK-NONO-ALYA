'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { EVENT_CONFIG } from '@/config/eventConfig';

export type Language = 'en' | 'ms';

export interface Translations {
  // Navigation & General
  liveWall: string;
  backHome: string;
  language: string;

  // Cover & Event
  miniTitle: string;
  date: string;
  venue: string;
  hashtag: string;
  welcomeMessage: string;
  yourName: string;
  enterNamePlaceholder: string;
  shareMomentBtn: string;
  photoboothBtn: string;
  liveWallBtn: string;
  footerCelebration: string;

  // Guestbook Modal
  modalTitle: string;
  forCouple: string;
  wishesLabel: string;
  wishesPlaceholder: string;
  charsCount: string;
  photoLabel: string;
  photoboothModalBtn: string;
  selfieBtn: string;
  choosePhotoBtn: string;
  removePhoto: string;
  filterSelectTitle: string;
  frameSelectTitle: string;
  voiceLabel: string;
  submitBtn: string;
  submittingBtn: string;
  thankYouTitle: string;
  thankYouSubtitle: string;
  thankYouLiveWallNote: string;
  sendAnotherBtn: string;
  watchLiveWallBtn: string;

  // Photobooth Studio
  photoboothTitle: string;
  photoboothSubtitle: string;
  cameraConnecting: string;
  cameraPermissionNote: string;
  cameraInactive: string;
  enableCameraBtn: string;
  chooseGalleryBtn: string;
  switchLens: string;
  frontCamera: string;
  rearCamera: string;
  liveBadge: string;
  readyToPose: string;
  takingShot: string;
  startAutoBooth: string;
  takeSlot: string;
  activeFormat: string;
  cutsLayout: string;
  photosCount: string;
  chooseCollection: string;
  tapToChange: string;
  downloadStrip: string;
  attachToGuestbook: string;
  savedToDevice: string;
  retakeSlot: string;
  errorNameRequired: string;
  errorMessageRequired: string;
  errorInvalidImage: string;
  errorGenericSubmit: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    // Navigation & General
    liveWall: 'Live Wall',
    backHome: 'Back to Home',
    language: 'English',

    // Cover & Event
    miniTitle: EVENT_CONFIG.eventType.en,
    date: EVENT_CONFIG.date.en,
    venue: EVENT_CONFIG.venue,
    hashtag: EVENT_CONFIG.hashtag,
    welcomeMessage: 'Share your photos, videos, or heartfelt wishes captured with us today.',
    yourName: 'Your Name',
    enterNamePlaceholder: 'Enter your name...',
    shareMomentBtn: 'Share Your Wishes',
    photoboothBtn: '📸 Photobooth Studio (6 Strip Styles)',
    liveWallBtn: 'Open Gallery & Live Wall',
    footerCelebration: 'memoira • {title} Engagement Celebration',

    // Guestbook Modal
    modalTitle: 'Leave a Memory & Wish',
    forCouple: 'For {title}',
    wishesLabel: 'Heartfelt Wishes & Blessings',
    wishesPlaceholder: 'Write your warmest wishes, congratulations, or lovely memories...',
    charsCount: 'characters',
    photoLabel: 'Photo / Selfie (Optional)',
    photoboothModalBtn: '✨ Snap Photobooth Strip (6 Strip Styles)',
    selfieBtn: 'Selfie',
    choosePhotoBtn: 'Choose Photo',
    removePhoto: 'Remove photo',
    filterSelectTitle: 'Select Photo Filter',
    frameSelectTitle: 'Select Aesthetic Frame',
    voiceLabel: 'Voice Note (Optional)',
    submitBtn: 'Send Your Wishes',
    submittingBtn: 'Saving your memory...',
    thankYouTitle: 'Thank You, {name}!',
    thankYouSubtitle: 'Your heartfelt wishes and memories have been saved.',
    thankYouLiveWallNote: 'Your memory will appear live on the celebration screen.',
    sendAnotherBtn: 'Send Another Wish',
    watchLiveWallBtn: 'Watch Live Wall',

    // Photobooth Studio
    photoboothTitle: 'Photobooth Studio',
    photoboothSubtitle: 'Capture beautiful moments or select photos for your keepsake strip.',
    cameraConnecting: 'Connecting Camera...',
    cameraPermissionNote: 'Please allow camera access in your browser to start.',
    cameraInactive: 'Camera Inactive',
    enableCameraBtn: 'Enable Camera',
    chooseGalleryBtn: 'Choose from Gallery',
    switchLens: 'Flip Lens',
    frontCamera: 'Front Camera',
    rearCamera: 'Rear Camera',
    liveBadge: 'Live',
    readyToPose: 'Get ready to pose! 📸',
    takingShot: 'Taking Shot',
    startAutoBooth: 'Start Auto-Booth ({count} Shots)',
    takeSlot: 'Snap Slot {slot}',
    activeFormat: 'Active Strip Format:',
    cutsLayout: '{count} Cuts Layout',
    photosCount: '{current}/{total} photos',
    chooseCollection: 'Choose Photobooth Strip (6 Styles)',
    tapToChange: 'Tap to switch',
    downloadStrip: 'Download Strip',
    attachToGuestbook: 'Attach to Guestbook',
    savedToDevice: 'Saved to your device!',
    retakeSlot: 'Retake',
    errorNameRequired: 'Please enter your name.',
    errorMessageRequired: 'Please leave your heartfelt wish or message.',
    errorInvalidImage: 'Please select a valid image file (JPEG/PNG/HEIC).',
    errorGenericSubmit: 'An error occurred while saving your memory.',
  },
  ms: {
    // Navigation & General
    liveWall: 'Live Wall',
    backHome: 'Kembali ke Laman Utama',
    language: 'Bahasa Melayu',

    // Cover & Event
    miniTitle: EVENT_CONFIG.eventType.ms,
    date: EVENT_CONFIG.date.ms,
    venue: EVENT_CONFIG.venue,
    hashtag: EVENT_CONFIG.hashtag,
    welcomeMessage: 'Kongsi gambar, video, atau momen indah yang anda rakam bersama kami.',
    yourName: 'Nama anda',
    enterNamePlaceholder: 'Masukkan nama anda...',
    shareMomentBtn: 'Kongsikan Momen',
    photoboothBtn: '📸 Studio Photobooth (6 Pilihan Strip)',
    liveWallBtn: 'Buka Galeri & Live Wall',
    footerCelebration: 'memoira • Sambutan Pertunangan {title}',

    // Guestbook Modal
    modalTitle: 'Tinggalkan Momen & Ucapan',
    forCouple: 'Untuk {title}',
    wishesLabel: 'Ucapan & Doa Tulus',
    wishesPlaceholder: 'Tuliskan ucapan tahniah, doa keberkatan, atau memori bersama pasangan...',
    charsCount: 'aksara',
    photoLabel: 'Gambar / Selfie (Pilihan)',
    photoboothModalBtn: '✨ Ambil Strip Photobooth (6 Pilihan Gaya)',
    selfieBtn: 'Selfie',
    choosePhotoBtn: 'Pilih Gambar',
    removePhoto: 'Padam gambar',
    filterSelectTitle: 'Pilih Penapis Foto',
    frameSelectTitle: 'Pilih Bingkai Estetik',
    voiceLabel: 'Mesej Suara (Pilihan)',
    submitBtn: 'Hantar Ucapan',
    submittingBtn: 'Menyimpan memori...',
    thankYouTitle: 'Terima Kasih, {name}!',
    thankYouSubtitle: 'Ucapan & memori indah anda telah selamat disimpan.',
    thankYouLiveWallNote: 'Memori anda akan dipaparkan secara langsung pada skrin Live Wall majlis.',
    sendAnotherBtn: 'Hantar Ucapan Lain',
    watchLiveWallBtn: 'Tonton Live Wall',

    // Photobooth Studio
    photoboothTitle: 'Photobooth Studio',
    photoboothSubtitle: 'Rakam momen indah atau pilih gambar untuk strip kenangan anda.',
    cameraConnecting: 'Menyambungkan Kamera...',
    cameraPermissionNote: 'Sila benarkan akses kamera pelayar anda untuk memulakan photobooth.',
    cameraInactive: 'Kamera Belum Aktif',
    enableCameraBtn: 'Hidupkan Kamera',
    chooseGalleryBtn: 'Pilih Galeri',
    switchLens: 'Tukar Lensa',
    frontCamera: 'Kamera Depan',
    rearCamera: 'Kamera Belakang',
    liveBadge: 'Langsung',
    readyToPose: 'Sedia untuk bergaya! 📸',
    takingShot: 'Mengambil Gambar',
    startAutoBooth: 'Mula Auto-Booth ({count} Shots)',
    takeSlot: 'Ambil Slot {slot}',
    activeFormat: 'Format Strip Aktif:',
    cutsLayout: '{count} Cuts Layout',
    photosCount: '{current}/{total} gambar',
    chooseCollection: 'Pilih Koleksi Strip Photobooth (6 Pilihan)',
    tapToChange: 'Sentuh untuk tukar',
    downloadStrip: 'Muat Turun Strip',
    attachToGuestbook: 'Sertakan ke Buku Tetamu',
    savedToDevice: 'Disimpan ke peranti anda!',
    retakeSlot: 'Ambil Semula',
    errorNameRequired: 'Sila masukkan nama anda.',
    errorMessageRequired: 'Sila tinggalkan ucapan atau doa tulus anda.',
    errorInvalidImage: 'Sila pilih fail gambar yang sah (JPEG/PNG/HEIC).',
    errorGenericSubmit: 'Berlaku ralat semasa menyimpan memori anda.',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: TRANSLATIONS.en,
});

const STORAGE_KEY = 'guestbook_preferred_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is English as requested
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === 'en' || saved === 'ms') {
        setLanguageState(saved);
      }
    } catch {
      // Ignore if localStorage is unavailable
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  };

  const t = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * Elegant language switch toggle button
 */
export function LanguageToggle({ lightMode = false }: { lightMode?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-full border text-xs font-semibold select-none transition-colors ${
        lightMode
          ? 'bg-warm-100 border-warm-200 text-warm-700'
          : 'bg-black/40 sm:bg-white/15 border-white/20 text-warm-200 backdrop-blur-xs sm:backdrop-blur-md shadow-sm'
      }`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-0.5 rounded-full transition-all text-[11px] font-bold ${
          language === 'en'
            ? lightMode
              ? 'bg-white text-champagne-950 shadow-xs'
              : 'bg-champagne-400 text-warm-950 shadow-xs'
            : lightMode
            ? 'text-warm-500 hover:text-warm-800'
            : 'text-white/60 hover:text-white'
        }`}
        title="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ms')}
        className={`px-2.5 py-0.5 rounded-full transition-all text-[11px] font-bold ${
          language === 'ms'
            ? lightMode
              ? 'bg-white text-champagne-950 shadow-xs'
              : 'bg-champagne-400 text-warm-950 shadow-xs'
            : lightMode
            ? 'text-warm-500 hover:text-warm-800'
            : 'text-white/60 hover:text-white'
        }`}
        title="Tukar ke Bahasa Melayu"
      >
        BM
      </button>
    </div>
  );
}
