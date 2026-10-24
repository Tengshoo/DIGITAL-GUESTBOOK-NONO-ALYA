'use client';

import React from 'react';
import { PHOTOBOOTH_STRIP_THEMES, PhotoboothStripTheme, StripSlot } from './stripThemes';
import { PHOTO_FILTERS } from '@/components/PhotoFilterSelector';
import { Camera, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { EVENT_CONFIG } from '@/config/eventConfig';

interface PhotoboothStripViewProps {
  photos: string[];
  themeId: PhotoboothStripTheme['id'];
  filterId?: string;
  activeSlotIndex?: number | null;
  onSelectSlot?: (index: number) => void;
  onClearSlot?: (index: number) => void;
  eventInfo?: {
    welcomeTitle: string;
    miniTitle?: string;
    date: string;
    venue: string;
    hashtag: string;
  };
  compact?: boolean;
}

export default function PhotoboothStripView({
  photos,
  themeId,
  filterId = 'original',
  activeSlotIndex = null,
  onSelectSlot,
  onClearSlot,
  eventInfo = {
    welcomeTitle: EVENT_CONFIG.title,
    miniTitle: EVENT_CONFIG.eventType.ms,
    date: EVENT_CONFIG.date.en,
    venue: EVENT_CONFIG.venue,
    hashtag: EVENT_CONFIG.hashtag,
  },
  compact = false,
}: PhotoboothStripViewProps) {
  const currentTheme =
    PHOTOBOOTH_STRIP_THEMES.find((t) => t.id === themeId) || PHOTOBOOTH_STRIP_THEMES[0];
  const currentFilter = PHOTO_FILTERS.find((f) => f.id === filterId);

  const { width, height, slots, stickers = [], textBlocks = [] } = currentTheme;

  return (
    <div
      className={`relative mx-auto rounded-2xl shadow-xl overflow-hidden select-none gpu-layer border border-warm-300/40 ${
        compact
          ? 'w-full max-w-[240px]'
          : 'w-full max-w-[280px] xs:max-w-[300px] sm:max-w-[320px]'
      }`}
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundColor: currentTheme.bgColor,
        containerType: 'inline-size',
      }}
    >
      {/* 1. Authentic Template Artwork Background */}
      <img
        src={currentTheme.backgroundUrl}
        alt={currentTheme.name}
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
        loading="eager"
      />

      {/* 2. Photo Slots (Rendered at exact coordinate percentages with rotations) */}
      {slots.map((slot: StripSlot, index: number) => {
        const photo = photos[index];
        const isActive = activeSlotIndex === index;
        const leftPct = (slot.x / width) * 100;
        const topPct = (slot.y / height) * 100;
        const widthPct = (slot.width / width) * 100;
        const heightPct = (slot.height / height) * 100;
        const rotation = slot.rotation || 0;

        return (
          <div
            key={slot.id || `slot-${index}`}
            onClick={() => onSelectSlot && onSelectSlot(index)}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              zIndex: 5 + index,
            }}
            className={`absolute cursor-pointer group transition-transform duration-150 gpu-layer ${
              isActive ? 'ring-2 ring-champagne-400 ring-offset-2 scale-[1.01]' : ''
            }`}
          >
            <div className="w-full h-full relative overflow-hidden bg-[#ECE8E1]/80 shadow-inner flex items-center justify-center">
              {photo ? (
                <>
                  <img
                    src={photo}
                    alt={`Slot ${index + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-150"
                    style={{
                      filter: currentFilter?.cssFilter || 'none',
                    }}
                  />

                  {/* Slot Hover & Active Touch Overlay / Clear button */}
                  {onClearSlot && (
                    <div
                      className={`absolute inset-0 bg-black/45 transition-opacity duration-150 flex items-center justify-center gap-2 ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSlot(index);
                        }}
                        className="p-1.5 rounded-full bg-white/95 text-rose-600 hover:bg-white shadow-md transition-transform duration-100 active:scale-90"
                        title="Padam & Ambil Semula"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Slot badge indicator */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs text-[8px] font-mono text-white/90 opacity-60 group-hover:opacity-100 transition-opacity">
                    #{index + 1}
                  </div>
                </>
              ) : (
                /* Empty Slot Placeholder */
                <div
                  className={`w-full h-full flex flex-col items-center justify-center p-2 text-center transition-colors duration-150 ${
                    isActive
                      ? 'bg-champagne-100/95 text-champagne-900 border-2 border-dashed border-champagne-500'
                      : 'bg-warm-100/75 text-warm-500 hover:bg-warm-100 border border-dashed border-warm-300'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 transition-transform duration-150 ${
                      isActive
                        ? 'bg-champagne-500 text-white shadow-md ring-2 ring-champagne-300 scale-105'
                        : 'bg-warm-200/80 text-warm-600 group-hover:scale-110'
                    }`}
                  >
                    {isActive ? (
                      <Camera className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </div>
                  <span className="text-[9px] font-bold tracking-wider uppercase">
                    Slot {index + 1}
                  </span>
                  <span className="text-[7.5px] opacity-75 hidden sm:block">
                    {isActive ? 'Kamera sedia' : 'Sentuh sini'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 3. Authentic Stickers (e.g. Yellow Gingham Bow) */}
      {stickers.map((sticker) => {
        const leftPct = (sticker.x / width) * 100;
        const topPct = (sticker.y / height) * 100;
        const widthPct = (sticker.width / width) * 100;
        const heightPct = (sticker.height / height) * 100;
        const rotation = sticker.rotation || 0;

        return (
          <img
            key={sticker.id}
            src={sticker.url}
            alt="Sticker"
            className="absolute pointer-events-none drop-shadow-md select-none"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              zIndex: 15,
            }}
          />
        );
      })}

      {/* 4. Text Blocks & Typography */}
      {textBlocks.map((tb) => {
        const leftPct = (tb.x / width) * 100;
        const topPct = (tb.y / height) * 100;
        const widthPct = (tb.width / width) * 100;
        const heightPct = (tb.height / height) * 100;
        const rotation = tb.rotation || 0;

        let content = tb.text || '';
        if (tb.binding === 'event.name') {
          content = eventInfo.welcomeTitle;
        } else if (tb.binding === 'event.date') {
          content = eventInfo.date;
        } else if (tb.binding === 'event.venue') {
          content = eventInfo.venue;
        } else if (tb.binding === 'event.hashtag') {
          content = eventInfo.hashtag;
        }

        if (tb.uppercase) {
          content = content.toUpperCase();
        }

        // Relative font scaling using container % width approximation
        const relativeFontSize = `${(tb.fontSize / width) * 100}cqw`;

        return (
          <div
            key={tb.id}
            className="absolute pointer-events-none flex items-center select-none"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              justifyContent:
                tb.align === 'center'
                  ? 'center'
                  : tb.align === 'right'
                  ? 'flex-end'
                  : 'flex-start',
              textAlign: tb.align,
              color: tb.color,
              fontFamily: tb.fontFamily,
              fontSize: relativeFontSize,
              fontWeight: tb.fontWeight,
              lineHeight: 1.15,
              zIndex: 12,
            }}
          >
            <span className="truncate w-full">{content}</span>
          </div>
        );
      })}
    </div>
  );
}
