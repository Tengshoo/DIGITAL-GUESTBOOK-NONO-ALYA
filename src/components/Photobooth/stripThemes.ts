import { EVENT_CONFIG } from '@/config/eventConfig';

export interface StripSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
}

export interface StripSticker {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
}

export interface StripTextBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  color: string;
  align: 'left' | 'center' | 'right';
  binding: 'event.name' | 'event.date' | 'event.venue' | 'event.hashtag' | 'custom';
  text?: string;
  uppercase?: boolean;
}

export interface PhotoboothStripTheme {
  id:
    | 'floral-clip'
    | 'lace-jardin'
    | 'film-vintage-v2'
    | 'kodak-studio'
    | 'white-black'
    | 'film-classic';
  name: string;
  subtitle: string;
  badge: string;
  icon: string;
  slotCount: number;
  width: number;
  height: number;
  backgroundUrl: string;
  backgroundFit?: 'cover' | 'fill' | 'contain';
  bgColor: string;
  textColor: string;
  accentColor: string;
  tagline: string;
  slots: StripSlot[];
  stickers?: StripSticker[];
  textBlocks?: StripTextBlock[];
}

export const PHOTOBOOTH_STRIP_THEMES: PhotoboothStripTheme[] = [
  {
    id: 'floral-clip',
    name: 'Floral Clip & Bow',
    subtitle: 'Botanical Paper & Gingham Bow',
    badge: 'Cottagecore Cute',
    icon: '🎀',
    slotCount: 3,
    width: 1080,
    height: 1920,
    backgroundUrl: '/assets/photobooth/floral-clip.png',
    backgroundFit: 'fill',
    bgColor: '#FAF6EE',
    textColor: '#241D17',
    accentColor: '#EAB308',
    tagline: `sweetest memories together ♡ ${EVENT_CONFIG.date.numeric}`,
    slots: [
      {
        id: 'slot-1',
        x: 328.07,
        y: 155.21,
        width: 529,
        height: 470,
        rotation: 2.6959,
        borderRadius: 4,
      },
      {
        id: 'slot-2',
        x: 304.28,
        y: 654.64,
        width: 529,
        height: 470,
        rotation: 2.6959,
        borderRadius: 4,
      },
      {
        id: 'slot-3',
        x: 275.5,
        y: 1150.04,
        width: 529,
        height: 470,
        rotation: 2.6959,
        borderRadius: 4,
      },
    ],
    stickers: [
      {
        id: 'yellow-gingham-bow',
        url: '/assets/photobooth/yellow-gingham-bow.webp',
        x: 99.69,
        y: 1031.53,
        width: 285.66,
        height: 262.7,
        rotation: 41.378,
      },
    ],
    textBlocks: [
      {
        id: 'couple-name',
        x: 257.63,
        y: 1618,
        width: 529.08,
        height: 65,
        rotation: 3.541,
        fontFamily: "'Dancing Script', cursive",
        fontSize: 54,
        fontWeight: 700,
        color: '#261E18',
        align: 'center',
        binding: 'event.name',
        uppercase: false,
      },
      {
        id: 'event-date',
        x: 371.19,
        y: 1730,
        width: 272.11,
        height: 35,
        rotation: 3.094,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 26,
        fontWeight: 600,
        color: '#4A3E36',
        align: 'center',
        binding: 'event.date',
        uppercase: false,
      },
    ],
  },
  {
    id: 'lace-jardin',
    name: 'Lacé Jardin',
    subtitle: 'French Lace Cutout & Angled Strips',
    badge: 'Coquette Lace',
    icon: '💐',
    slotCount: 4,
    width: 608,
    height: 1762,
    backgroundUrl: '/assets/photobooth/lace-jardin.png',
    backgroundFit: 'fill',
    bgColor: '#FFFBF7',
    textColor: '#4A3B32',
    accentColor: '#D97706',
    tagline: `romantic memories • ${EVENT_CONFIG.title.toLowerCase()}`,
    slots: [
      {
        id: 'slot-1',
        x: -50.02,
        y: -25.48,
        width: 410,
        height: 450,
        rotation: -16.1995,
        borderRadius: 4,
      },
      {
        id: 'slot-2',
        x: 80.45,
        y: 426.13,
        width: 410,
        height: 450,
        rotation: -16.1995,
        borderRadius: 4,
      },
      {
        id: 'slot-3',
        x: 210.45,
        y: 876.08,
        width: 410,
        height: 450,
        rotation: -16.1995,
        borderRadius: 4,
      },
      {
        id: 'slot-4',
        x: 341.17,
        y: 1326.72,
        width: 410,
        height: 450,
        rotation: -16.1995,
        borderRadius: 4,
      },
    ],
    textBlocks: [],
  },
  {
    id: 'film-vintage-v2',
    name: 'Film Vintage V2',
    subtitle: 'Darkroom Negative & Typewriter',
    badge: 'Retro Grunge',
    icon: '🎞️',
    slotCount: 4,
    width: 1080,
    height: 1920,
    backgroundUrl: '/assets/photobooth/film-vintage-v2.png',
    backgroundFit: 'fill',
    bgColor: '#1A1817',
    textColor: '#F5F5F0',
    accentColor: '#E2E8F0',
    tagline: `RETRO DARKROOM PHOTO ARCHIVE // ${EVENT_CONFIG.date.numeric}`,
    slots: [
      {
        id: 'slot-1',
        x: -99.65,
        y: 530.1,
        width: 775.69,
        height: 413.7,
        rotation: -6.8486,
        borderRadius: 2,
      },
      {
        id: 'slot-2',
        x: 679.0,
        y: 436.82,
        width: 775.69,
        height: 413.7,
        rotation: -6.8486,
        borderRadius: 2,
      },
      {
        id: 'slot-3',
        x: -196.11,
        y: 1235.02,
        width: 775.69,
        height: 413.7,
        rotation: -6.8486,
        borderRadius: 2,
      },
      {
        id: 'slot-4',
        x: 583.67,
        y: 1143.11,
        width: 775.69,
        height: 413.7,
        rotation: -6.8486,
        borderRadius: 2,
      },
    ],
    textBlocks: [
      {
        id: 'couple-name',
        x: 126.18,
        y: 1013.26,
        width: 827.63,
        height: 77.1,
        rotation: -7.131,
        fontFamily: "'Courier Prime', monospace",
        fontSize: 38,
        fontWeight: 700,
        color: '#1F2933',
        align: 'left',
        binding: 'event.name',
        uppercase: true,
      },
      {
        id: 'event-date',
        x: 454.86,
        y: 1678.37,
        width: 615.06,
        height: 91.66,
        rotation: -7.072,
        fontFamily: "'Courier Prime', monospace",
        fontSize: 38,
        fontWeight: 700,
        color: '#1F2933',
        align: 'center',
        binding: 'event.date',
        uppercase: true,
      },
    ],
  },
  {
    id: 'kodak-studio',
    name: 'Kodak Studio',
    subtitle: 'Iconic 35mm Gold & Red Border',
    badge: 'Kodak 35mm',
    icon: '📸',
    slotCount: 3,
    width: 608,
    height: 1762,
    backgroundUrl: '/assets/photobooth/kodak-studio.png',
    backgroundFit: 'fill',
    bgColor: '#1E1B18',
    textColor: '#FFD700',
    accentColor: '#DC2626',
    tagline: 'KODAK COLOR PLUS 200 // 35MM STUDIO FILM',
    slots: [
      {
        id: 'slot-1',
        x: 16.38,
        y: 94.52,
        width: 575.23,
        height: 397,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-2',
        x: 16.38,
        y: 682.5,
        width: 575.23,
        height: 397,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-3',
        x: 16.38,
        y: 1270.48,
        width: 575.23,
        height: 397,
        rotation: 0,
        borderRadius: 2,
      },
    ],
    textBlocks: [],
  },
  {
    id: 'white-black',
    name: 'White & Black',
    subtitle: 'Korean Minimalist Studio Strip',
    badge: 'Life4Cuts Clean',
    icon: '🤍',
    slotCount: 3,
    width: 700,
    height: 2400,
    backgroundUrl: '/assets/photobooth/white-black.png',
    backgroundFit: 'fill',
    bgColor: '#FAF8F5',
    textColor: '#181310',
    accentColor: '#4A3B32',
    tagline: 'Life4Cuts Chic Minimalist Studio',
    slots: [
      {
        id: 'slot-1',
        x: 60.67,
        y: 491.04,
        width: 578.67,
        height: 434,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-2',
        x: 60.67,
        y: 983.0,
        width: 578.67,
        height: 434,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-3',
        x: 60.67,
        y: 1478.01,
        width: 578.67,
        height: 434,
        rotation: 0,
        borderRadius: 2,
      },
    ],
    textBlocks: [],
  },
  {
    id: 'film-classic',
    name: 'Film Classic 4-Cut',
    subtitle: 'Perforated 35mm Film Roll',
    badge: 'Analog 35mm',
    icon: '🎬',
    slotCount: 4,
    width: 802,
    height: 1920,
    backgroundUrl: '/assets/photobooth/film-classic.png',
    backgroundFit: 'fill',
    bgColor: '#121214',
    textColor: '#FFFFFF',
    accentColor: '#F59E0B',
    tagline: '35MM ANALOG NEGATIVE FILM STRIP',
    slots: [
      {
        id: 'slot-1',
        x: 114.39,
        y: 54.46,
        width: 578.76,
        height: 434.07,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-2',
        x: 114.39,
        y: 515.05,
        width: 578.76,
        height: 434.07,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-3',
        x: 114.39,
        y: 975.64,
        width: 578.76,
        height: 434.07,
        rotation: 0,
        borderRadius: 2,
      },
      {
        id: 'slot-4',
        x: 114.39,
        y: 1436.23,
        width: 578.76,
        height: 434.07,
        rotation: 0,
        borderRadius: 2,
      },
    ],
    textBlocks: [],
  },
];
