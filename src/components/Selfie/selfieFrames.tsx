'use client';

import React from 'react';
import { EVENT_CONFIG } from '@/config/eventConfig';
import { PHOTO_FILTERS } from '@/components/PhotoFilterSelector';

export type SelfieFrameId =
  | 'none'
  | 'wds01'
  | 'royal-lace'
  | 'editorial-vogue'
  | 'minimal-arch'
  | 'botanical-monogram'
  | 'retro-cam'
  | 'polaroid-chin';

export interface SelfieFrameDefinition {
  id: SelfieFrameId;
  code: string;
  name: string;
  category: string;
  accent: string;
}

export const SELFIE_FRAMES: SelfieFrameDefinition[] = [
  {
    id: 'none',
    code: 'NONE',
    name: 'No Frame',
    category: 'Clean',
    accent: '#A8A29E',
  },
  {
    id: 'wds01',
    code: 'WDS01',
    name: 'Pixel Filigree',
    category: 'Signature Lace',
    accent: '#E5E7EB',
  },
  {
    id: 'royal-lace',
    code: 'WDS02',
    name: 'Royal Champagne',
    category: 'Luxury Gold',
    accent: '#E5C378',
  },
  {
    id: 'editorial-vogue',
    code: 'WDS03',
    name: 'Editorial Vogue',
    category: 'Magazine',
    accent: '#FFFFFF',
  },
  {
    id: 'minimal-arch',
    code: 'WDS04',
    name: 'Fine-Line Arch',
    category: 'Minimalist',
    accent: '#F5F5F4',
  },
  {
    id: 'botanical-monogram',
    code: 'WDS05',
    name: 'Botanical Crest',
    category: 'Romantic',
    accent: '#E2E8F0',
  },
  {
    id: 'retro-cam',
    code: 'WDS06',
    name: '90s Camcorder',
    category: 'Retro Film',
    accent: '#FBBF24',
  },
  {
    id: 'polaroid-chin',
    code: 'WDS07',
    name: 'Instant Story',
    category: 'Polaroid',
    accent: '#FAF8F5',
  },
];

export interface SelfieEventMeta {
  headerTagline: string;
  fullCoupleName: string;
  firstPartner: string;
  secondPartner: string;
  initials: string;
  dateLong: string;
  dateNumeric: string;
  venue: string;
  hashtag: string;
}

export function getSelfieEventMeta(): SelfieEventMeta {
  const fullCoupleName =
    EVENT_CONFIG.photobooth?.coupleNames?.trim() ||
    EVENT_CONFIG.title?.trim() ||
    'Our Celebration';

  const parts = fullCoupleName.split(/\s*(?:&|\bdan\b|\band\b)\s*/i).filter(Boolean);
  const firstPartner = (parts[0] || fullCoupleName).trim();
  const secondPartner = (parts[1] || '').trim();

  const i1 = firstPartner.charAt(0).toUpperCase() || 'A';
  const i2 = secondPartner ? secondPartner.charAt(0).toUpperCase() : '♡';
  const initials = secondPartner ? `${i1} & ${i2}` : i1;

  const rawTagline =
    EVENT_CONFIG.photobooth?.tagline?.trim() ||
    EVENT_CONFIG.eventType?.en?.trim() ||
    'The Celebration of';

  const headerTagline = /wedding celebration/i.test(rawTagline)
    ? 'THE WEDDING OF'
    : /engagement celebration/i.test(rawTagline)
    ? 'THE ENGAGEMENT OF'
    : rawTagline.toUpperCase();

  return {
    headerTagline,
    fullCoupleName,
    firstPartner,
    secondPartner,
    initials,
    dateLong: EVENT_CONFIG.date?.en || '26 December 2026',
    dateNumeric: EVENT_CONFIG.photobooth?.date || EVENT_CONFIG.date?.numeric || '26.12.2026',
    venue: EVENT_CONFIG.venue || '',
    hashtag: EVENT_CONFIG.hashtag || '',
  };
}

const PIXEL_CORNER_COORDS: Array<[number, number]> = [
  [2, 1], [3, 1], [4, 1], [5, 1], [8, 1], [9, 1], [10, 1], [14, 1], [15, 1],
  [1, 2], [2, 2], [5, 2], [6, 2], [7, 2], [10, 2], [11, 2], [13, 2], [16, 2], [17, 2],
  [1, 3], [4, 3], [6, 3], [7, 3], [11, 3], [12, 3], [16, 3], [18, 3],
  [2, 4], [3, 4], [7, 4], [8, 4], [9, 4], [14, 4], [15, 4], [17, 4],
  [1, 5], [2, 5], [5, 5], [6, 5], [10, 5], [11, 5], [13, 5],
  [1, 6], [4, 6], [5, 6], [7, 6], [9, 6], [12, 6],
  [2, 7], [3, 7], [6, 7], [8, 7],
  [1, 8], [4, 8], [5, 8], [7, 8],
  [1, 9], [2, 9], [5, 9], [6, 9],
  [1, 10], [3, 10], [6, 10],
  [2, 11], [3, 11], [5, 11], [7, 11],
  [1, 12], [4, 12], [6, 12], [8, 12],
  [1, 13], [2, 13], [5, 13], [7, 13],
  [2, 14], [3, 14], [5, 14],
  [1, 15], [4, 15], [6, 15],
  [1, 16], [2, 16], [5, 16],
  [2, 17], [3, 17], [4, 17],
  [1, 18], [3, 18],
  [2, 19], [3, 19],
  [2, 20],
];

const PIXEL_EMBLEM_COORDS: Array<[number, number]> = [
  [7, 0], [8, 0],
  [6, 1], [9, 1],
  [5, 2], [7, 2], [8, 2], [10, 2],
  [2, 3], [3, 3], [6, 3], [9, 3], [12, 3], [13, 3],
  [1, 4], [4, 4], [7, 4], [8, 4], [11, 4], [14, 4],
  [1, 5], [3, 5], [5, 5], [7, 5], [8, 5], [10, 5], [12, 5], [14, 5],
  [2, 6], [6, 6], [7, 6], [8, 6], [9, 6], [13, 6],
  [4, 7], [5, 7], [7, 7], [8, 7], [10, 7], [11, 7],
  [3, 8], [6, 8], [7, 8], [8, 8], [9, 8], [12, 8],
  [4, 9], [5, 9], [10, 9], [11, 9],
];

function PixelCornerSvg({
  flipX = false,
  flipY = false,
  className = '',
  color = 'rgba(255,255,255,0.88)',
}: {
  flipX?: boolean;
  flipY?: boolean;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 22"
      className={className}
      style={{
        transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
        shapeRendering: 'crispEdges',
      }}
    >
      {PIXEL_CORNER_COORDS.map(([x, y], idx) => (
        <rect key={idx} x={x} y={y} width={0.82} height={0.82} fill={color} />
      ))}
    </svg>
  );
}

function PixelEmblemSvg({
  className = '',
  color = 'rgba(255,255,255,0.9)',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 16 10" className={className} style={{ shapeRendering: 'crispEdges' }}>
      {PIXEL_EMBLEM_COORDS.map(([x, y], idx) => (
        <rect key={idx} x={x} y={y} width={0.82} height={0.82} fill={color} />
      ))}
    </svg>
  );
}

function RoyalCornerSvg({
  flipX = false,
  flipY = false,
  className = '',
  color = '#E5C378',
}: {
  flipX?: boolean;
  flipY?: boolean;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={{ transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})` }}
    >
      <path
        d="M6 56V18C6 11.373 11.373 6 18 6H56"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 46V20C12 15.582 15.582 12 20 12H46"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.7"
        strokeLinecap="round"
      />
      <path
        d="M6 26C14 26 20 20 20 12M26 6C26 14 20 20 12 20"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="2.2" fill={color} />
      <circle cx="28" cy="9" r="1.3" fill={color} />
      <circle cx="9" cy="28" r="1.3" fill={color} />
    </svg>
  );
}

/**
 * Live 60fps overlay rendered directly on top of the 9:16 camera feed and review card
 */
export function SelfieFrameOverlay({
  frameId,
  meta = getSelfieEventMeta(),
  isReviewMode = false,
}: {
  frameId: SelfieFrameId;
  meta?: SelfieEventMeta;
  isReviewMode?: boolean;
}) {
  if (frameId === 'none') return null;

  const bottomTextPos = isReviewMode ? 'bottom-10' : 'bottom-24';

  if (frameId === 'wds01') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/50 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        <PixelCornerSvg className="absolute top-3.5 left-3.5 w-16 h-18 sm:w-20 sm:h-22 opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]" />
        <PixelCornerSvg
          flipX
          className="absolute top-3.5 right-3.5 w-16 h-18 sm:w-20 sm:h-22 opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
        />
        <PixelCornerSvg
          flipY
          className="absolute bottom-4 left-3.5 w-16 h-18 sm:w-20 sm:h-22 opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
        />
        <PixelCornerSvg
          flipX
          flipY
          className="absolute bottom-4 right-3.5 w-16 h-18 sm:w-20 sm:h-22 opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
        />

        <div className="absolute top-12 sm:top-14 inset-x-10 text-center">
          <p className="font-mono text-[11px] sm:text-xs tracking-[0.26em] uppercase text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            {meta.headerTagline}
          </p>
        </div>

        <div className={`absolute ${bottomTextPos} inset-x-6 flex flex-col items-center text-center transition-all duration-200`}>
          {meta.secondPartner ? (
            <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <span className="font-mono text-sm sm:text-base tracking-[0.2em] uppercase font-semibold">
                {meta.firstPartner}
              </span>
              <PixelEmblemSvg className="w-7 h-5 sm:w-8 sm:h-5 shrink-0" />
              <span className="font-mono text-sm sm:text-base tracking-[0.2em] uppercase font-semibold">
                {meta.secondPartner}
              </span>
            </div>
          ) : (
            <span className="font-mono text-sm sm:text-base tracking-[0.2em] uppercase font-semibold text-white/95 drop-shadow">
              {meta.fullCoupleName}
            </span>
          )}

          {meta.hashtag && (
            <span className="mt-0.5 text-[9px] sm:text-[10px] font-sans font-bold tracking-[0.18em] uppercase text-white/75 drop-shadow">
              {meta.hashtag}
            </span>
          )}

          <span className="mt-1 font-mono text-[11px] sm:text-xs tracking-[0.14em] text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {meta.dateLong}
          </span>
        </div>
      </div>
    );
  }

  if (frameId === 'royal-lace') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        <div className="absolute inset-4 rounded-2xl border border-[#E5C378]/45" />

        <RoyalCornerSvg className="absolute top-3 left-3 w-14 h-14" />
        <RoyalCornerSvg flipX className="absolute top-3 right-3 w-14 h-14" />
        <RoyalCornerSvg flipY className="absolute bottom-3 left-3 w-14 h-14" />
        <RoyalCornerSvg flipX flipY className="absolute bottom-3 right-3 w-14 h-14" />

        <div className="absolute top-12 inset-x-8 text-center">
          <p className="font-serif text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#F5DEB3] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            {meta.headerTagline}
          </p>
        </div>

        <div className={`absolute ${bottomTextPos} inset-x-6 flex flex-col items-center text-center transition-all duration-200`}>
          <p
            className="text-2xl sm:text-3xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            style={{ fontFamily: "'Dancing Script', 'Playfair Display', Georgia, serif" }}
          >
            {meta.fullCoupleName}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] tracking-[0.22em] uppercase text-[#F5DEB3]/95 font-medium drop-shadow">
            <span>✦</span>
            <span>{meta.dateNumeric}</span>
            <span>✦</span>
          </div>
        </div>
      </div>
    );
  }

  if (frameId === 'editorial-vogue') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        <div className="absolute top-12 inset-x-5 text-center">
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/80 font-sans mb-1 drop-shadow">
            {meta.headerTagline}
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.08em] uppercase text-white leading-none drop-shadow-[0_3px_12px_rgba(0,0,0,0.8)]">
            {meta.fullCoupleName}
          </h3>
          <div className="w-16 h-[1px] bg-white/60 mx-auto mt-2" />
        </div>

        <div className={`absolute ${bottomTextPos} inset-x-6 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-white/90 font-sans border-t border-white/30 pt-2.5 drop-shadow transition-all duration-200`}>
          <span>{meta.dateNumeric}</span>
          <span className="font-semibold">{meta.hashtag || meta.venue}</span>
        </div>
      </div>
    );
  }

  if (frameId === 'minimal-arch') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className={`absolute inset-x-5 top-11 ${isReviewMode ? 'bottom-7' : 'bottom-22'} rounded-t-full rounded-b-2xl border border-white/70 transition-all duration-200`} />
        <div className={`absolute inset-x-6.5 top-12.5 ${isReviewMode ? 'bottom-8.5' : 'bottom-23.5'} rounded-t-full rounded-b-xl border border-white/25 transition-all duration-200`} />

        <div className={`absolute ${isReviewMode ? 'bottom-12' : 'bottom-26'} inset-x-8 text-center transition-all duration-200`}>
          <p className="text-[9px] tracking-[0.28em] uppercase text-white/80 mb-1 drop-shadow">
            {meta.headerTagline}
          </p>
          <p className="font-serif italic text-xl sm:text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {meta.fullCoupleName}
          </p>
          <p className="text-[10px] tracking-[0.2em] text-white/80 mt-0.5 drop-shadow">
            {meta.dateLong}
          </p>
        </div>
      </div>
    );
  }

  if (frameId === 'botanical-monogram') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        <div className="absolute top-11 inset-x-0 flex flex-col items-center">
          <div className="w-11 h-11 rounded-full border border-white/75 bg-black/25 backdrop-blur-[2px] flex items-center justify-center shadow-md">
            <span className="font-serif text-xs font-semibold tracking-wider text-white">
              {meta.initials}
            </span>
          </div>
        </div>

        <div className={`absolute ${bottomTextPos} inset-x-6 text-center flex flex-col items-center transition-all duration-200`}>
          <div className="flex items-center gap-2 text-white/75 text-xs mb-0.5">
            <span>❦</span>
            <span className="text-[9px] tracking-[0.26em] uppercase font-sans">
              {meta.headerTagline}
            </span>
            <span>❦</span>
          </div>
          <p className="font-serif text-xl sm:text-2xl font-semibold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {meta.fullCoupleName}
          </p>
          <p className="text-[10px] tracking-[0.18em] uppercase text-white/85 mt-1 drop-shadow">
            {meta.dateLong} {meta.venue ? `• ${meta.venue}` : ''}
          </p>
        </div>
      </div>
    );
  }

  if (frameId === 'retro-cam') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute top-12 left-5 w-6 h-6 border-t-2 border-l-2 border-white/80" />
        <div className="absolute top-12 right-5 w-6 h-6 border-t-2 border-r-2 border-white/80" />
        <div className={`absolute ${isReviewMode ? 'bottom-8' : 'bottom-24'} left-5 w-6 h-6 border-b-2 border-l-2 border-white/80 transition-all duration-200`} />
        <div className={`absolute ${isReviewMode ? 'bottom-8' : 'bottom-24'} right-5 w-6 h-6 border-b-2 border-r-2 border-white/80 transition-all duration-200`} />

        <div className="absolute top-14 left-8 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/90 font-bold drop-shadow">
            REC • {meta.hashtag || 'LIVE'}
          </span>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 opacity-40">
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white" />
        </div>

        <div className={`absolute ${isReviewMode ? 'bottom-11' : 'bottom-26'} left-8 right-8 flex items-end justify-between transition-all duration-200`}>
          <div>
            <p className="font-mono text-xs sm:text-sm font-bold tracking-[0.15em] uppercase text-[#FBBF24] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              {meta.fullCoupleName}
            </p>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#FDE68A] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {meta.headerTagline}
            </p>
          </div>
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#FBBF24] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            &apos;{meta.dateNumeric}
          </p>
        </div>
      </div>
    );
  }

  if (frameId === 'polaroid-chin') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <div className="absolute inset-0 border-[12px] border-b-[96px] border-[#FAF8F5]" />
        <div className="absolute inset-x-4 bottom-[22px] text-center flex flex-col items-center justify-center h-[64px]">
          <p
            className="text-xl sm:text-2xl text-[#2C221E] leading-tight"
            style={{ fontFamily: "'Dancing Script', 'Playfair Display', Georgia, serif" }}
          >
            {meta.fullCoupleName} ♡
          </p>
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#6E5D53] font-sans font-semibold mt-0.5">
            {meta.dateLong} {meta.hashtag ? `• ${meta.hashtag}` : ''}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Renders the 9:16 selfie image (from a raw captured/uploaded data URL) with the chosen
 * color filter and high-resolution frame artwork baked into a 1080x1920 JPEG.
 */
export async function renderSelfieWithFrameToCanvas(
  rawDataUrl: string,
  frameId: SelfieFrameId,
  filterId: string = 'original'
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      const meta = getSelfieEventMeta();
      const filterObj = PHOTO_FILTERS.find((f) => f.id === filterId);
      const filterCss = filterObj?.canvasFilter || 'none';

      // 1. Cover-crop source image into 1080x1920 (9:16)
      const targetRatio = W / H;
      const srcRatio = img.width / img.height;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;

      if (srcRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.save();
      try {
        if (filterCss !== 'none') {
          ctx.filter = filterCss;
        }
      } catch {
        // ignore
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      ctx.restore();

      if (frameId === 'none') {
        resolve(canvas.toDataURL('image/jpeg', 0.9));
        return;
      }

      const drawReadableScrims = (topAlpha = 0.42, bottomAlpha = 0.62) => {
        const topGrad = ctx.createLinearGradient(0, 0, 0, 340);
        topGrad.addColorStop(0, `rgba(0,0,0,${topAlpha})`);
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 340);

        const botGrad = ctx.createLinearGradient(0, H - 520, 0, H);
        botGrad.addColorStop(0, 'rgba(0,0,0,0)');
        botGrad.addColorStop(1, `rgba(0,0,0,${bottomAlpha})`);
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H - 520, W, 520);
      };

      if (frameId === 'wds01') {
        drawReadableScrims(0.45, 0.68);

        const drawPixelCorner = (ox: number, oy: number, fx: number, fy: number) => {
          const cell = 11;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.shadowColor = 'rgba(0,0,0,0.65)';
          ctx.shadowBlur = 8;
          for (const [px, py] of PIXEL_CORNER_COORDS) {
            const rx = ox + fx * px * cell;
            const ry = oy + fy * py * cell;
            ctx.fillRect(rx, ry, cell * 0.84, cell * 0.84);
          }
          ctx.restore();
        };

        const margin = 44;
        drawPixelCorner(margin, margin, 1, 1);
        drawPixelCorner(W - margin - 10, margin, -1, 1);
        drawPixelCorner(margin, H - margin - 10, 1, -1);
        drawPixelCorner(W - margin - 10, H - margin - 10, -1, -1);

        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.font = '600 30px "Courier Prime", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(meta.headerTagline.split('').join(' '), W / 2, 138);

        const namesY = H - 230;
        if (meta.secondPartner) {
          const eCell = 6.5;
          const eWidth = 16 * eCell;
          const eStartX = W / 2 - eWidth / 2;
          const eStartY = namesY - 34;
          for (const [ex, ey] of PIXEL_EMBLEM_COORDS) {
            ctx.fillRect(eStartX + ex * eCell, eStartY + ey * eCell, eCell * 0.85, eCell * 0.85);
          }

          ctx.font = '700 42px "Courier Prime", "Courier New", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(meta.firstPartner.toUpperCase(), W / 2 - 82, namesY);
          ctx.textAlign = 'left';
          ctx.fillText(meta.secondPartner.toUpperCase(), W / 2 + 82, namesY);
        } else {
          ctx.font = '700 44px "Courier Prime", "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(meta.fullCoupleName.toUpperCase(), W / 2, namesY);
        }

        if (meta.hashtag) {
          ctx.font = '700 24px "Montserrat", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillText(meta.hashtag.toUpperCase(), W / 2, namesY + 46);
        }

        ctx.font = '500 30px "Courier Prime", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(meta.dateLong, W / 2, namesY + 94);
        ctx.restore();
      } else if (frameId === 'royal-lace') {
        drawReadableScrims(0.4, 0.65);

        ctx.save();
        ctx.strokeStyle = 'rgba(229, 195, 120, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 52, W - 104, H - 104);
        ctx.strokeStyle = 'rgba(229, 195, 120, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(68, 68, W - 136, H - 136);

        const corners: Array<[number, number]> = [
          [52, 52],
          [W - 52, 52],
          [52, H - 52],
          [W - 52, H - 52],
        ];
        ctx.fillStyle = '#E5C378';
        for (const [cx, cy] of corners) {
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#F5DEB3';
        ctx.font = '600 26px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(meta.headerTagline.split('').join(' '), W / 2, 136);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 84px "Dancing Script", "Playfair Display", Georgia, serif';
        ctx.fillText(meta.fullCoupleName, W / 2, H - 210);

        ctx.fillStyle = '#F5DEB3';
        ctx.font = '600 28px "Cinzel", Georgia, serif';
        ctx.fillText(`✦   ${meta.dateNumeric}   ✦`, W / 2, H - 142);
        ctx.restore();
      } else if (frameId === 'editorial-vogue') {
        drawReadableScrims(0.55, 0.62);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.font = '600 24px "Montserrat", sans-serif';
        ctx.fillText(meta.headerTagline.split('').join(' '), W / 2, 135);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 76px "Cinzel", "Playfair Display", Georgia, serif';
        ctx.fillText(meta.fullCoupleName.toUpperCase(), W / 2, 222);

        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 90, 256);
        ctx.lineTo(W / 2 + 90, 256);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(76, H - 175);
        ctx.lineTo(W - 76, H - 175);
        ctx.stroke();

        ctx.font = '600 26px "Montserrat", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.textAlign = 'left';
        ctx.fillText(meta.dateNumeric, 76, H - 125);
        ctx.textAlign = 'right';
        ctx.fillText((meta.hashtag || meta.venue).toUpperCase(), W - 76, H - 125);
        ctx.restore();
      } else if (frameId === 'minimal-arch') {
        drawReadableScrims(0.25, 0.62);

        ctx.save();
        const drawArch = (inset: number, alpha: number, lw: number) => {
          const left = inset;
          const right = W - inset;
          const top = inset + 30;
          const bottom = H - inset - 20;
          const radius = (right - left) / 2;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(W / 2, top + radius, radius, Math.PI, 0, false);
          ctx.lineTo(right, bottom - 36);
          ctx.quadraticCurveTo(right, bottom, right - 36, bottom);
          ctx.lineTo(left + 36, bottom);
          ctx.quadraticCurveTo(left, bottom, left, bottom - 36);
          ctx.closePath();
          ctx.stroke();
        };

        drawArch(58, 0.82, 3);
        drawArch(74, 0.3, 1.5);

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.font = '600 22px "Montserrat", sans-serif';
        ctx.fillText(meta.headerTagline.split('').join(' '), W / 2, H - 255);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'italic 600 62px "Playfair Display", Georgia, serif';
        ctx.fillText(meta.fullCoupleName, W / 2, H - 185);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '500 26px "Montserrat", sans-serif';
        ctx.fillText(meta.dateLong, W / 2, H - 132);
        ctx.restore();
      } else if (frameId === 'botanical-monogram') {
        drawReadableScrims(0.42, 0.65);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.arc(W / 2, 145, 62, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 34px "Cinzel", Georgia, serif';
        ctx.fillText(meta.initials, W / 2, 147);

        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 10;
        ctx.font = '600 22px "Montserrat", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`❦   ${meta.headerTagline}   ❦`, W / 2, H - 250);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 60px "Playfair Display", Georgia, serif';
        ctx.fillText(meta.fullCoupleName, W / 2, H - 182);

        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = '500 24px "Montserrat", sans-serif';
        const sub = meta.venue ? `${meta.dateLong} • ${meta.venue}` : meta.dateLong;
        ctx.fillText(sub.toUpperCase(), W / 2, H - 125);
        ctx.restore();
      } else if (frameId === 'retro-cam') {
        drawReadableScrims(0.32, 0.55);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 5;
        const b = 68;
        const len = 58;
        ctx.beginPath();
        ctx.moveTo(b, b + len);
        ctx.lineTo(b, b);
        ctx.lineTo(b + len, b);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(W - b - len, b);
        ctx.lineTo(W - b, b);
        ctx.lineTo(W - b, b + len);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(b, H - b - len);
        ctx.lineTo(b, H - b);
        ctx.lineTo(b + len, H - b);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(W - b - len, H - b);
        ctx.lineTo(W - b, H - b);
        ctx.lineTo(W - b, H - b - len);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(112, 118, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 28px "Courier Prime", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`REC • ${meta.hashtag || 'LIVE'}`, 138, 127);

        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FBBF24';
        ctx.font = '700 38px "Courier Prime", monospace';
        ctx.fillText(meta.fullCoupleName.toUpperCase(), 102, H - 148);
        ctx.fillStyle = '#FDE68A';
        ctx.font = '600 24px "Courier Prime", monospace';
        ctx.fillText(meta.headerTagline, 102, H - 108);

        ctx.fillStyle = '#FBBF24';
        ctx.textAlign = 'right';
        ctx.font = '700 34px "Courier Prime", monospace';
        ctx.fillText(`'${meta.dateNumeric}`, W - 102, H - 108);
        ctx.restore();
      } else if (frameId === 'polaroid-chin') {
        const side = 42;
        const bottom = 270;
        ctx.save();
        ctx.fillStyle = '#FAF8F5';
        ctx.fillRect(0, 0, W, side);
        ctx.fillRect(0, H - bottom, W, bottom);
        ctx.fillRect(0, 0, side, H);
        ctx.fillRect(W - side, 0, side, H);

        ctx.strokeStyle = 'rgba(44, 34, 30, 0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(side, side, W - side * 2, H - side - bottom);

        ctx.fillStyle = '#2C221E';
        ctx.textAlign = 'center';
        ctx.font = '700 76px "Dancing Script", "Playfair Display", Georgia, serif';
        ctx.fillText(`${meta.fullCoupleName} ♡`, W / 2, H - bottom / 2 - 12);

        ctx.fillStyle = '#6E5D53';
        ctx.font = '600 24px "Montserrat", sans-serif';
        const sub = meta.hashtag ? `${meta.dateLong} • ${meta.hashtag}` : meta.dateLong;
        ctx.fillText(sub.toUpperCase(), W / 2, H - bottom / 2 + 46);
        ctx.restore();
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
