'use client';

import React from 'react';
import { Sparkles, Check, Wand2 } from 'lucide-react';

export interface PhotoFilter {
  id: 'original' | 'champagne' | 'noir' | 'rose';
  name: string;
  shortLabel: string;
  tagline: string;
  cssFilter: string;
  canvasFilter: string;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  {
    id: 'original',
    name: 'Original',
    shortLabel: 'Original',
    tagline: 'Natural & clear',
    cssFilter: 'none',
    canvasFilter: 'none',
  },
  {
    id: 'champagne',
    name: 'Champagne Warm',
    shortLabel: 'Warm Gold',
    tagline: 'Golden celebration glow',
    cssFilter: 'sepia(0.32) saturate(1.28) contrast(1.08) brightness(1.04)',
    canvasFilter: 'sepia(0.32) saturate(1.28) contrast(1.08) brightness(1.04)',
  },
  {
    id: 'noir',
    name: 'Classic Noir',
    shortLabel: 'Noir B&W',
    tagline: 'Timeless monochrome',
    cssFilter: 'grayscale(1) contrast(1.22) brightness(0.96)',
    canvasFilter: 'grayscale(1) contrast(1.22) brightness(0.96)',
  },
  {
    id: 'rose',
    name: 'Blush Romance',
    shortLabel: 'Blush Rose',
    tagline: 'Soft romantic tone',
    cssFilter: 'contrast(1.06) brightness(1.05) saturate(1.24) sepia(0.18) hue-rotate(-12deg)',
    canvasFilter: 'contrast(1.06) brightness(1.05) saturate(1.24) sepia(0.18) hue-rotate(-12deg)',
  },
];

export async function applyFilterToCanvas(
  rawImgSrc: string,
  filterId: string
): Promise<string> {
  return new Promise((resolve) => {
    const filter = PHOTO_FILTERS.find((f) => f.id === filterId);
    if (!filter || filter.id === 'original' || filter.canvasFilter === 'none') {
      resolve(rawImgSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawImgSrc);
        return;
      }

      try {
        ctx.filter = filter.canvasFilter;
      } catch {
        // Fallback if filter string isn't supported in current environment
      }

      ctx.drawImage(img, 0, 0, img.width, img.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => {
      resolve(rawImgSrc);
    };
    img.src = rawImgSrc;
  });
}

interface PhotoFilterSelectorProps {
  photoUrl: string;
  selectedFilter: string;
  onSelectFilter: (filterId: 'original' | 'champagne' | 'noir' | 'rose') => void;
  disabled?: boolean;
}

export default function PhotoFilterSelector({
  photoUrl,
  selectedFilter,
  onSelectFilter,
  disabled = false,
}: PhotoFilterSelectorProps) {
  return (
    <div className="w-full flex flex-col gap-2.5 pt-2 animate-fade-in">
      <div className="flex items-center justify-between text-xs text-warm-700">
        <div className="flex items-center gap-1.5 font-medium">
          <Wand2 className="w-3.5 h-3.5 text-champagne-600" />
          <span>Select Photo Filter (4 Styles)</span>
        </div>
        <span className="text-[11px] text-warm-500">Tap to preview</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PHOTO_FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFilter(filter.id)}
              className={`relative flex flex-col items-center p-2 rounded-2xl border transition-colors duration-150 active:scale-95 ${
                isSelected
                  ? 'border-champagne-500 bg-champagne-50/90 shadow-champagne ring-2 ring-champagne-300'
                  : 'border-warm-200 bg-white/80 hover:bg-warm-50/90 hover:border-warm-300'
              }`}
            >
              {/* Mini Preview Thumbnail with the respective filter applied */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden mb-1.5 border border-warm-200/80 bg-warm-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={filter.name}
                  className="w-full h-full object-cover"
                  style={{ filter: filter.cssFilter }}
                />

                {isSelected && (
                  <div className="absolute inset-0 bg-champagne-900/30 backdrop-blur-[0.5px] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-champagne-700 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Label */}
              <span className={`text-[11px] font-medium leading-tight text-center ${
                isSelected ? 'text-champagne-900 font-semibold' : 'text-warm-700'
              }`}>
                {filter.shortLabel}
              </span>

              {/* Tagline */}
              <span className="text-[9px] text-warm-400 text-center line-clamp-1 mt-0.5">
                {filter.id === 'original' ? 'Natural' : filter.id === 'champagne' ? 'Golden' : filter.id === 'noir' ? 'B&W' : 'Blush'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
