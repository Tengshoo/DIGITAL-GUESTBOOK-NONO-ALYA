'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export default function AudioPlayer({ src, label = 'Listen to Voice Wish', className = '', compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration || 1;
    setProgress((current / total) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <audio
          ref={audioRef}
          src={src}
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="hidden"
        />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-sm ${
            isPlaying
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-champagne-100 text-champagne-800 hover:bg-champagne-200'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>
        <span className="text-xs text-warm-700 font-medium">Voice note</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-champagne-50/80 border border-champagne-200/90 shadow-sm backdrop-blur-sm ${className}`}
    >
      <audio
        ref={audioRef}
        src={src}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow ${
          isPlaying
            ? 'bg-rose-600 text-white ring-4 ring-rose-200 scale-105'
            : 'bg-champagne-600 hover:bg-champagne-700 text-white active:scale-95'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-warm-900 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-champagne-600" />
            {label}
          </span>
          <span className="text-[10px] text-warm-500 uppercase tracking-wider font-semibold">
            {isPlaying ? 'Playing' : 'Audio Note'}
          </span>
        </div>
        <div className="w-full bg-champagne-200/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-champagne-600 h-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
