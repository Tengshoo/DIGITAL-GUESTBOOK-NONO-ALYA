'use client';

import React from 'react';
import { Frame, Check, Sparkles, Heart, CircleOff, Star } from 'lucide-react';

export interface PhotoFrameConfig {
  id: 'none' | 'polaroid' | 'champagne-gold' | 'cute-hearts' | 'blush-romance';
  name: string;
  shortLabel: string;
  tagline: string;
  badge: string;
}

export const PHOTO_FRAMES: PhotoFrameConfig[] = [
  {
    id: 'none',
    name: 'No Frame',
    shortLabel: 'No Frame',
    tagline: 'Clean & natural',
    badge: 'Borderless',
  },
  {
    id: 'polaroid',
    name: 'Classic Polaroid',
    shortLabel: 'Polaroid',
    tagline: 'forever & always ♡',
    badge: 'Vintage Film',
  },
  {
    id: 'champagne-gold',
    name: 'Golden Elegance',
    shortLabel: 'Gold Foil',
    tagline: 'Gilded border & sparkles',
    badge: 'Luxury',
  },
  {
    id: 'cute-hearts',
    name: 'Cute Heart Doodles',
    shortLabel: 'Cute Hearts',
    tagline: 'Sweet hearts & sparkles',
    badge: 'Playful',
  },
  {
    id: 'blush-romance',
    name: 'Blush Ribbon',
    shortLabel: 'Blush Bow',
    tagline: 'Pastel rose with bow',
    badge: 'Romantic',
  },
];

// Helper to draw a crisp vector heart on canvas
function drawCanvasHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurve = size * 0.3;
  ctx.moveTo(x, y + topCurve);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurve);
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurve) / 2, x, y + size, x, y + size);
  ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topCurve) / 2, x + size / 2, y + topCurve);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurve);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to draw a four-pointed star / sparkle on canvas
function drawCanvasSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.lineTo(
      cx + Math.cos(angle + Math.PI / 4) * (r * 0.28),
      cy + Math.sin(angle + Math.PI / 4) * (r * 0.28)
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Composite both the chosen filter and the chosen frame onto an HTML5 Canvas
export async function applyFilterAndFrameToCanvas(
  rawImgSrc: string,
  filterId: string,
  frameId: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const srcW = img.width;
      const srcH = img.height;

      // Filter settings
      let filterCss = 'none';
      if (filterId === 'champagne') {
        filterCss = 'sepia(0.32) saturate(1.28) contrast(1.08) brightness(1.04)';
      } else if (filterId === 'noir') {
        filterCss = 'grayscale(1) contrast(1.22) brightness(0.96)';
      } else if (filterId === 'rose') {
        filterCss = 'contrast(1.06) brightness(1.05) saturate(1.24) sepia(0.18) hue-rotate(-12deg)';
      }

      // If no frame is selected, just apply filter (if any) and return
      if (frameId === 'none') {
        const canvas = document.createElement('canvas');
        canvas.width = srcW;
        canvas.height = srcH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawImgSrc);
          return;
        }
        try {
          ctx.filter = filterCss;
        } catch {
          // ignore
        }
        ctx.drawImage(img, 0, 0, srcW, srcH);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
        return;
      }

      // Frame dimension calculations
      const borderSize = Math.max(24, Math.round(Math.min(srcW, srcH) * 0.055));
      const bottomExtra = frameId === 'polaroid' ? borderSize * 2.4 : borderSize;

      const totalW = srcW + borderSize * 2;
      const totalH = srcH + borderSize + bottomExtra;

      const canvas = document.createElement('canvas');
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawImgSrc);
        return;
      }

      // 1. Draw Frame Background
      if (frameId === 'polaroid') {
        // Classic Warm Polaroid White
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, 0, totalW, totalH);
      } else if (frameId === 'champagne-gold') {
        // Soft Ivory with Gold Border
        ctx.fillStyle = '#FCF9F2';
        ctx.fillRect(0, 0, totalW, totalH);
      } else if (frameId === 'cute-hearts') {
        // Pastel Blush Cream
        ctx.fillStyle = '#FFF6F8';
        ctx.fillRect(0, 0, totalW, totalH);
      } else if (frameId === 'blush-romance') {
        // Soft Rose
        ctx.fillStyle = '#FDF0F3';
        ctx.fillRect(0, 0, totalW, totalH);
      }

      // 2. Draw Filtered Image inside frame aperture
      ctx.save();
      try {
        ctx.filter = filterCss;
      } catch {
        // ignore
      }
      ctx.drawImage(img, borderSize, borderSize, srcW, srcH);
      ctx.restore();

      // Inner image boundary hairline/shadow
      ctx.save();
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(borderSize, borderSize, srcW, srcH);
      ctx.restore();

      // 3. Draw Aesthetic & Cute Frame Accents
      if (frameId === 'polaroid') {
        // Handwritten style caption on Polaroid bottom chin
        ctx.save();
        ctx.fillStyle = '#5A4636';
        const fontSize = Math.max(18, Math.round(borderSize * 0.72));
        ctx.font = `italic 600 ${fontSize}px "Playfair Display", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const captionY = srcH + borderSize + bottomExtra / 2;
        ctx.fillText('forever & always ♡', totalW / 2, captionY);
        ctx.restore();
      } else if (frameId === 'champagne-gold') {
        // Double gold hairlines
        ctx.save();
        ctx.strokeStyle = '#C5A152';
        ctx.lineWidth = Math.max(2, Math.round(borderSize * 0.08));
        const inset = borderSize * 0.45;
        ctx.strokeRect(inset, inset, totalW - inset * 2, totalH - inset * 2);

        // Corner Sparkles
        const sparkR = Math.max(8, Math.round(borderSize * 0.35));
        drawCanvasSparkle(ctx, inset, inset, sparkR, '#C5A152');
        drawCanvasSparkle(ctx, totalW - inset, inset, sparkR, '#C5A152');
        drawCanvasSparkle(ctx, inset, totalH - inset, sparkR, '#C5A152');
        drawCanvasSparkle(ctx, totalW - inset, totalH - inset, sparkR, '#C5A152');

        // Top center cute golden heart
        drawCanvasHeart(ctx, totalW / 2, inset - sparkR * 0.6, sparkR * 1.1, '#C5A152');
        ctx.restore();
      } else if (frameId === 'cute-hearts') {
        ctx.save();
        // Inner dashed pink hairline
        ctx.strokeStyle = '#F5B0BB';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        const inset = borderSize * 0.45;
        ctx.strokeRect(inset, inset, totalW - inset * 2, totalH - inset * 2);
        ctx.setLineDash([]);

        // Cute hearts in corners and along edges
        const heartSize = Math.max(12, Math.round(borderSize * 0.45));
        drawCanvasHeart(ctx, inset, inset - heartSize * 0.2, heartSize, '#DC546C');
        drawCanvasHeart(ctx, totalW - inset, inset - heartSize * 0.2, heartSize, '#DC546C');
        drawCanvasHeart(ctx, inset, totalH - inset - heartSize * 0.4, heartSize, '#DC546C');
        drawCanvasHeart(ctx, totalW - inset, totalH - inset - heartSize * 0.4, heartSize, '#DC546C');

        // Cute bottom text
        ctx.fillStyle = '#C13650';
        const fontSize = Math.max(14, Math.round(borderSize * 0.5));
        ctx.font = `600 ${fontSize}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✨ so much love ✨', totalW / 2, totalH - inset * 0.5);
        ctx.restore();
      } else if (frameId === 'blush-romance') {
        ctx.save();
        // Subtle dual rose line
        ctx.strokeStyle = '#EE7B8E';
        ctx.lineWidth = 2;
        const inset = borderSize * 0.4;
        ctx.strokeRect(inset, inset, totalW - inset * 2, totalH - inset * 2);

        // Cute corner sparkles and center sweet message
        const sparkR = Math.max(7, Math.round(borderSize * 0.3));
        drawCanvasSparkle(ctx, inset, inset, sparkR, '#EE7B8E');
        drawCanvasSparkle(ctx, totalW - inset, inset, sparkR, '#EE7B8E');
        drawCanvasSparkle(ctx, inset, totalH - inset, sparkR, '#EE7B8E');
        drawCanvasSparkle(ctx, totalW - inset, totalH - inset, sparkR, '#EE7B8E');

        ctx.fillStyle = '#A1253B';
        const fontSize = Math.max(14, Math.round(borderSize * 0.52));
        ctx.font = `italic 600 ${fontSize}px "Playfair Display", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('with love & joy ♡', totalW / 2, totalH - inset * 0.45);
        ctx.restore();
      }

      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };

    img.onerror = () => {
      resolve(rawImgSrc);
    };

    img.src = rawImgSrc;
  });
}

// Live CSS Frame Overlay for instantaneous 60fps real-time UI preview
export function LivePhotoFrameOverlay({
  frameId,
  children,
}: {
  frameId: PhotoFrameConfig['id'];
  children: React.ReactNode;
}) {
  if (frameId === 'none') {
    return <div className="w-full relative">{children}</div>;
  }

  if (frameId === 'polaroid') {
    return (
      <div className="w-full p-3 sm:p-4 pb-9 sm:pb-12 bg-[#FAF9F6] rounded-2xl shadow-polaroid border border-[#ECE6DC] relative transition-all">
        <div className="rounded-xl overflow-hidden border border-black/10">
          {children}
        </div>
        <div className="absolute bottom-2.5 sm:bottom-3 left-0 right-0 text-center font-serif italic text-warm-800 text-xs sm:text-sm font-semibold select-none">
          forever & always ♡
        </div>
      </div>
    );
  }

  if (frameId === 'champagne-gold') {
    return (
      <div className="w-full p-3.5 sm:p-4 bg-[#FCF9F2] rounded-2xl shadow-polaroid border-2 border-champagne-300 relative transition-all">
        {/* Inner golden hairline */}
        <div className="absolute inset-2 border border-champagne-400/80 rounded-xl pointer-events-none" />
        
        {/* Golden Corner sparkles */}
        <span className="absolute top-1 left-1.5 text-champagne-600 text-[10px]">✦</span>
        <span className="absolute top-1 right-1.5 text-champagne-600 text-[10px]">✦</span>
        <span className="absolute bottom-1 left-1.5 text-champagne-600 text-[10px]">✦</span>
        <span className="absolute bottom-1 right-1.5 text-champagne-600 text-[10px]">✦</span>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-champagne-600 text-[10px]">♡</div>

        <div className="rounded-lg overflow-hidden border border-champagne-200/90 relative z-10">
          {children}
        </div>
      </div>
    );
  }

  if (frameId === 'cute-hearts') {
    return (
      <div className="w-full p-3.5 sm:p-4 pb-8 sm:pb-9 bg-[#FFF6F8] rounded-2xl shadow-polaroid border-2 border-rose-200 relative transition-all">
        {/* Dashed Inner border */}
        <div className="absolute inset-2 border border-dashed border-rose-300 rounded-xl pointer-events-none" />
        
        {/* Cute Hearts in corners */}
        <span className="absolute top-1.5 left-2 text-rose-500 text-xs">♡</span>
        <span className="absolute top-1.5 right-2 text-rose-500 text-xs">♡</span>
        <span className="absolute bottom-1.5 left-2 text-rose-500 text-xs">♡</span>
        <span className="absolute bottom-1.5 right-2 text-rose-500 text-xs">♡</span>

        <div className="rounded-lg overflow-hidden border border-rose-100 relative z-10">
          {children}
        </div>

        <div className="absolute bottom-1.5 left-0 right-0 text-center text-rose-600 font-sans font-semibold text-[10px] sm:text-xs select-none">
          ✨ so much love ✨
        </div>
      </div>
    );
  }

  if (frameId === 'blush-romance') {
    return (
      <div className="w-full p-3 sm:p-4 pb-7 sm:pb-8 bg-[#FDF0F3] rounded-2xl shadow-polaroid border-2 border-rose-300/80 relative transition-all">
        <div className="absolute inset-1.5 border border-rose-300/60 rounded-xl pointer-events-none" />
        
        <span className="absolute top-1 left-1.5 text-rose-600 text-[10px]">⋆</span>
        <span className="absolute top-1 right-1.5 text-rose-600 text-[10px]">⋆</span>

        <div className="rounded-lg overflow-hidden border border-rose-200/90 relative z-10">
          {children}
        </div>

        <div className="absolute bottom-1.5 left-0 right-0 text-center font-serif italic text-rose-800 text-[11px] sm:text-xs font-semibold select-none">
          with love & joy ♡
        </div>
      </div>
    );
  }

  return <div className="w-full relative">{children}</div>;
}

interface PhotoFrameSelectorProps {
  selectedFrame: PhotoFrameConfig['id'];
  onSelectFrame: (frameId: PhotoFrameConfig['id']) => void;
  disabled?: boolean;
}

export default function PhotoFrameSelector({
  selectedFrame,
  onSelectFrame,
  disabled = false,
}: PhotoFrameSelectorProps) {
  return (
    <div className="w-full flex flex-col gap-2 pt-2 animate-fade-in border-t border-warm-200/70 mt-2">
      <div className="flex items-center justify-between text-xs text-warm-700">
        <div className="flex items-center gap-1.5 font-medium">
          <Frame className="w-3.5 h-3.5 text-champagne-600" />
          <span>Aesthetic & Cute Frames (Optional)</span>
        </div>
        <span className="text-[11px] text-warm-500">
          {selectedFrame === 'none' ? 'No frame chosen' : 'Frame applied'}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {PHOTO_FRAMES.map((frame) => {
          const isSelected = selectedFrame === frame.id;

          return (
            <button
              key={frame.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFrame(frame.id)}
              className={`relative flex flex-col items-center justify-between p-2 rounded-xl border transition-colors duration-150 text-center min-h-[70px] ${
                isSelected
                  ? 'border-champagne-500 bg-champagne-50/90 shadow-champagne ring-2 ring-champagne-300'
                  : 'border-warm-200 bg-white/70 hover:bg-warm-50/80 hover:border-warm-300'
              }`}
            >
              {/* Mini Icon / Frame preview badge */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 text-xs ${
                  frame.id === 'none'
                    ? 'bg-warm-100 text-warm-500'
                    : frame.id === 'polaroid'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : frame.id === 'champagne-gold'
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : frame.id === 'cute-hearts'
                    ? 'bg-rose-100 text-rose-600 border border-rose-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {frame.id === 'none' ? (
                  <CircleOff className="w-3.5 h-3.5" />
                ) : frame.id === 'polaroid' ? (
                  <Frame className="w-3.5 h-3.5" />
                ) : frame.id === 'champagne-gold' ? (
                  <Sparkles className="w-3.5 h-3.5" />
                ) : frame.id === 'cute-hearts' ? (
                  <Heart className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Star className="w-3.5 h-3.5 fill-current" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] leading-tight font-medium ${
                  isSelected ? 'text-champagne-900 font-bold' : 'text-warm-700'
                }`}
              >
                {frame.shortLabel}
              </span>

              {/* Selection Checkmark */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-champagne-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
