'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, Sparkles, Check } from 'lucide-react';

interface SignatureCanvasProps {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

const INK_COLORS = [
  { name: 'Warm Gold', value: '#A9833B' },
  { name: 'Espresso', value: '#3F3229' },
  { name: 'Dusty Rose', value: '#C13650' },
  { name: 'Midnight', value: '#1F2937' },
];

export default function SignatureCanvas({ onChange, disabled = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState(INK_COLORS[0].value);
  const [lineWidth, setLineWidth] = useState(3);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Setup canvas size accounting for retina display
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Save previous drawing if canvas already has content
    let prevData: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // ignore
      }
    }

    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `180px`;

    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      if (prevData) {
        // Redraw previous data if available
        try {
          ctx.putImageData(prevData, 0, 0);
        } catch {
          // ignore
        }
      }
    }
  }, [strokeColor, lineWidth]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    lastPoint.current = coords;
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPoint.current = coords;
    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;

    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      // Export as PNG
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="w-full flex flex-col gap-2.5" ref={containerRef}>
      <div className="flex items-center justify-between text-xs text-warm-700">
        <div className="flex items-center gap-1.5 font-medium">
          <PenTool className="w-3.5 h-3.5 text-champagne-600" />
          <span>Signature & Doodle</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Color swatches */}
          <div className="flex items-center gap-1.5">
            {INK_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-label={`Ink color ${c.name}`}
                onClick={() => setStrokeColor(c.value)}
                className={`w-4 h-4 rounded-full transition-transform border border-warm-300 ${
                  strokeColor === c.value ? 'scale-125 ring-2 ring-champagne-400 ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          {/* Width toggles */}
          <div className="flex items-center gap-1 border-l border-warm-200 pl-2">
            {[2, 3, 5].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setLineWidth(w)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  lineWidth === w
                    ? 'bg-champagne-100 text-champagne-800 font-semibold'
                    : 'text-warm-500 hover:text-warm-800'
                }`}
              >
                {w === 2 ? 'Fine' : w === 3 ? 'Med' : 'Bold'}
              </button>
            ))}
          </div>

          {/* Clear button */}
          {hasDrawn && (
            <button
              type="button"
              onClick={clearCanvas}
              disabled={disabled}
              className="flex items-center gap-1 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="relative w-full rounded-xl border border-warm-200/80 bg-warm-50/50 shadow-inner overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair w-full block bg-white/60 backdrop-blur-sm"
        />

        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-warm-400/80 select-none">
            <Sparkles className="w-5 h-5 mb-1 text-champagne-400/60 animate-pulse" />
            <p className="font-serif italic text-sm">Draw a heart, sign your name, or leave a little doodle</p>
            <p className="text-[11px] text-warm-400 mt-0.5">Use your finger, stylus, or mouse</p>
          </div>
        )}

        {hasDrawn && (
          <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-champagne-700 bg-champagne-50/90 border border-champagne-200/60 px-2 py-0.5 rounded-full shadow-sm">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Signature captured</span>
          </div>
        )}
      </div>
    </div>
  );
}
