'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Volume2, CheckCircle2 } from 'lucide-react';

interface VoiceRecorderProps {
  onChange: (base64Audio: string | null) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onChange, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const MAX_DURATION = 60; // 60 seconds limit

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (disabled) return;
    setErrorMsg(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported mime type on iOS Safari vs Android Chrome
      let mimeType = '';
      const candidateTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/aac',
        'audio/ogg',
        'audio/wav',
      ];

      if (
        typeof MediaRecorder !== 'undefined' &&
        typeof MediaRecorder.isTypeSupported === 'function'
      ) {
        for (const type of candidateTypes) {
          try {
            if (MediaRecorder.isTypeSupported(type)) {
              mimeType = type;
              break;
            }
          } catch {
            // Some in-app browsers throw on isTypeSupported
          }
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        const options = mimeType ? { mimeType } : undefined;
        mediaRecorder = new MediaRecorder(stream, options);
      } catch {
        // Fallback for mobile browsers that reject custom options
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onChange(base64data);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone access error:', err);
      const message =
        err instanceof Error ? err.message : 'Could not access microphone. Please check permissions.';
      setErrorMsg(message);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const togglePlayback = () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((e) => console.error('Audio play error:', e));
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    const audio = audioElementRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioElementRef.current;
    if (audio) {
      setAudioDuration(audio.duration || 0);
    }
  };

  const resetRecording = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setAudioUrl(null);
    setRecordingDuration(0);
    setCurrentTime(0);
    setAudioDuration(0);
    onChange(null);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-warm-700">
        <div className="flex items-center gap-1.5 font-medium">
          <Volume2 className="w-3.5 h-3.5 text-champagne-600" />
          <span>Voice Wish (Optional)</span>
        </div>
        <span className="text-[11px] text-warm-500">Max 60s voice message</span>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* State 1: Ready to record */}
      {!isRecording && !audioUrl && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="w-full py-3 px-4 rounded-xl border border-warm-200/90 bg-warm-50/60 hover:bg-champagne-50/80 hover:border-champagne-300 transition-all flex items-center justify-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-full bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center text-rose-600 transition">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-warm-800">Record a voice note</span>
        </button>
      )}

      {/* State 2: Actively recording */}
      {isRecording && (
        <div className="p-3.5 rounded-xl border-2 border-rose-300 bg-rose-50/60 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-3.5 h-3.5 bg-rose-600 rounded-full animate-ping absolute" />
              <span className="w-3.5 h-3.5 bg-rose-600 rounded-full relative" />
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-rose-900 tracking-wide uppercase">
                Recording...
              </span>
              <span className="font-mono text-sm font-bold text-rose-800">
                {formatTime(recordingDuration)} / 01:00
              </span>
            </div>

            {/* Audio wave simulation bars */}
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1 h-3 bg-rose-400 rounded animate-pulse" />
              <div className="w-1 h-6 bg-rose-500 rounded animate-pulse delay-75" />
              <div className="w-1 h-4 bg-rose-400 rounded animate-pulse delay-150" />
              <div className="w-1 h-7 bg-rose-600 rounded animate-pulse delay-100" />
              <div className="w-1 h-3 bg-rose-400 rounded animate-pulse" />
            </div>
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Finish</span>
          </button>
        </div>
      )}

      {/* State 3: Recording captured, preview and re-record */}
      {audioUrl && !isRecording && (
        <div className="p-3 rounded-xl border border-champagne-200 bg-champagne-50/50 flex flex-col gap-2 animate-fade-in">
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            className="hidden"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause voice preview' : 'Play voice preview'}
                className="w-8 h-8 rounded-full bg-champagne-500 hover:bg-champagne-600 text-white flex items-center justify-center shadow-sm transition active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-warm-900 flex items-center gap-1">
                  <span>Voice Note Attached</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                </span>
                <span className="text-[11px] font-mono text-warm-600">
                  {formatTime(currentTime)} / {formatTime(audioDuration || recordingDuration)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetRecording}
              className="flex items-center gap-1 text-warm-600 hover:text-rose-700 bg-white/70 hover:bg-rose-50 border border-warm-200/80 px-2.5 py-1 rounded-lg text-xs transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Re-record</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-champagne-200/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-champagne-600 h-full transition-all duration-100"
              style={{
                width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
